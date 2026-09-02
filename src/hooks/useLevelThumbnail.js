import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getThumbnailUrlSequence,
  getYouTubeMaxResThumbnailUrl,
} from "../utils/format";

const MIN_THUMBNAIL_DIMENSION = 200;
const MAX_CONCURRENT_THUMB_LOADS = 10;
const RESOLVED_CACHE_LIMIT = 500;
const EXHAUSTED_SENTINEL = "";
const PERSIST_STORAGE_KEY = "thal-thumb-cache-v1";
const PERSIST_DEBOUNCE_MS = 300;

const YT_VI_RE =
  /(?:img\.youtube\.com|i\.ytimg\.com)\/vi\/([a-zA-Z0-9_-]{11})\//i;
const YT_STUB_RISKY_RE =
  /(?:img\.youtube\.com|i\.ytimg\.com)\/vi\/[^/]+\/(?:maxresdefault|sddefault)\./i;

const resolvedThumbCache = new Map();

let activeThumbLoads = 0;
const thumbLoadWaiters = [];
let persistTimer = null;
let persistHydrated = false;

const hydratePersistedCache = () => {
  if (persistHydrated || typeof sessionStorage === "undefined") return;
  persistHydrated = true;
  try {
    const raw = sessionStorage.getItem(PERSIST_STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const [key, value] = entry;
      if (typeof key !== "string" || typeof value !== "string") continue;
      // Never hydrate failure sentinels — a transient network failure must
      // not permanently blank a card for the rest of the tab session.
      if (value === EXHAUSTED_SENTINEL) continue;
      if (!resolvedThumbCache.has(key)) resolvedThumbCache.set(key, value);
    }
  } catch {
    // Ignore quota / parse errors — in-memory cache still works.
  }
};

const schedulePersistCache = () => {
  if (typeof sessionStorage === "undefined") return;
  if (persistTimer != null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    try {
      sessionStorage.setItem(
        PERSIST_STORAGE_KEY,
        JSON.stringify(
          [...resolvedThumbCache.entries()].filter(
            ([, value]) => value !== EXHAUSTED_SENTINEL,
          ),
        ),
      );
    } catch {
      // Ignore quota errors.
    }
  }, PERSIST_DEBOUNCE_MS);
};

hydratePersistedCache();

const acquireThumbnailSlot = () => {
  let acquired = false;
  let settled = false;
  let grant = null;

  const release = () => {
    if (settled) return;
    settled = true;

    if (!acquired) {
      const idx = thumbLoadWaiters.indexOf(grant);
      if (idx >= 0) thumbLoadWaiters.splice(idx, 1);
      return;
    }

    activeThumbLoads = Math.max(0, activeThumbLoads - 1);
    const next = thumbLoadWaiters.shift();
    if (next) next();
  };

  let resolvePromise = null;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  grant = () => {
    if (settled) return;
    acquired = true;
    activeThumbLoads += 1;
    resolvePromise(() => {
      release();
    });
  };

  if (activeThumbLoads < MAX_CONCURRENT_THUMB_LOADS) {
    grant();
  } else {
    thumbLoadWaiters.push(grant);
  }

  return { promise, cancel: release };
};

const makeCacheKey = (thumbnail, showcaseVideo, video, levelID) =>
  `${thumbnail ?? ""}\0${showcaseVideo ?? ""}\0${video ?? ""}\0${levelID ?? ""}`;

const rememberResolved = (key, value) => {
  if (resolvedThumbCache.has(key)) resolvedThumbCache.delete(key);
  resolvedThumbCache.set(key, value);
  while (resolvedThumbCache.size > RESOLVED_CACHE_LIMIT) {
    const oldest = resolvedThumbCache.keys().next().value;
    resolvedThumbCache.delete(oldest);
  }
  schedulePersistCache();
};

const isPrevterSmallThumb = (src) =>
  typeof src === "string" &&
  src.includes("levelthumbs.prevter.me/thumbnail/") &&
  /\/small\/?$/.test(src);

/** maxres/sd can decode as 120×90 stubs — keep those hidden until accepted. */
export const isRiskyThumbnailUrl = (url) =>
  typeof url === "string" && YT_STUB_RISKY_RE.test(url);

const isAcceptableThumbnail = (img, src) => {
  const { naturalWidth, naturalHeight } = img;
  if (naturalWidth === 0 || naturalHeight === 0) return false;
  if (isPrevterSmallThumb(src || img.currentSrc || img.src)) return true;
  if (
    naturalWidth < MIN_THUMBNAIL_DIMENSION &&
    naturalHeight < MIN_THUMBNAIL_DIMENSION
  ) {
    return false;
  }
  return true;
};

const sameImageUrl = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  try {
    return (
      new URL(a, window.location.href).href ===
      new URL(b, window.location.href).href
    );
  } catch {
    return false;
  }
};

const getYouTubeVideoIdFromThumbUrl = (url) => {
  if (typeof url !== "string") return null;
  const match = url.match(YT_VI_RE);
  return match ? match[1] : null;
};

const getMaxResUpgradeUrl = (src) => {
  const videoId = getYouTubeVideoIdFromThumbUrl(src);
  if (!videoId) return null;
  if (/\/maxresdefault\./i.test(src)) return null;
  return getYouTubeMaxResThumbnailUrl(videoId);
};

const readResolvedCache = (cacheKey, sequence, enabled) => {
  if (!enabled) {
    return { loadedUrl: null, exhausted: false, urlIndex: 0 };
  }

  const cached = resolvedThumbCache.get(cacheKey);
  if (cached === EXHAUSTED_SENTINEL) {
    return { loadedUrl: null, exhausted: true, urlIndex: 0 };
  }

  if (typeof cached === "string" && cached) {
    const idx = sequence.indexOf(cached);
    if (idx >= 0) {
      return { loadedUrl: cached, exhausted: false, urlIndex: idx };
    }
    // Persisted maxres (or rewritten host) may not be in the fallback sequence.
    return { loadedUrl: cached, exhausted: false, urlIndex: 0 };
  }

  return { loadedUrl: null, exhausted: false, urlIndex: 0 };
};

export function useLevelThumbnail({
  thumbnail,
  showcaseVideo,
  video,
  levelID,
  lazy = true,
  enabled = true,
}) {
  const ref = useRef(null);
  const imgRef = useRef(null);
  const handledSrcRef = useRef(null);
  const displayRecoveryRef = useRef(false);
  const currentUrlRef = useRef(null);
  const urlIndexRef = useRef(0);
  const sequenceLengthRef = useRef(0);
  const cacheKeyRef = useRef("");
  const [inView, setInView] = useState(!lazy);
  const [slotReady, setSlotReady] = useState(false);

  const cacheKey = useMemo(
    () => makeCacheKey(thumbnail, showcaseVideo, video, levelID),
    [thumbnail, showcaseVideo, video, levelID],
  );
  cacheKeyRef.current = cacheKey;

  const sequence = useMemo(() => {
    if (!enabled) return [];
    return getThumbnailUrlSequence(thumbnail, showcaseVideo, video, levelID);
  }, [thumbnail, showcaseVideo, video, levelID, enabled]);

  sequenceLengthRef.current = sequence.length;

  const cacheHit = useMemo(
    () => readResolvedCache(cacheKey, sequence, enabled),
    [cacheKey, sequence, enabled],
  );

  const [urlIndex, setUrlIndex] = useState(cacheHit.urlIndex);

  // Cached URLs are always final decisions (the maxres probe ran before they
  // were remembered), so hydrate them straight into the visible slot — no
  // re-probing, which used to delay every remount of non-maxres videos.
  const [acceptedUrl, setAcceptedUrl] = useState(cacheHit.loadedUrl);
  const [loadedUrl, setLoadedUrl] = useState(cacheHit.loadedUrl);
  const [exhausted, setExhausted] = useState(cacheHit.exhausted);
  const [syncKey, setSyncKey] = useState(cacheKey);

  // Hydrate from the session cache during render so remounts don't flash empty.
  if (syncKey !== cacheKey) {
    setSyncKey(cacheKey);
    setUrlIndex(cacheHit.urlIndex);
    setAcceptedUrl(cacheHit.loadedUrl);
    setLoadedUrl(cacheHit.loadedUrl);
    setExhausted(cacheHit.exhausted);
    handledSrcRef.current = cacheHit.loadedUrl;
    urlIndexRef.current = cacheHit.urlIndex;
    displayRecoveryRef.current = false;
  }

  const displayUrl = loadedUrl;
  const isExhausted = exhausted || cacheHit.exhausted;

  useEffect(() => {
    if (!lazy || !enabled) {
      setInView(true);
      return undefined;
    }

    setInView(false);
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy, enabled, sequence]);

  useEffect(() => {
    if (
      !enabled ||
      !inView ||
      isExhausted ||
      displayUrl ||
      acceptedUrl ||
      sequence.length === 0
    ) {
      setSlotReady(false);
      return undefined;
    }

    let active = true;
    const { promise, cancel } = acquireThumbnailSlot();

    promise.then((release) => {
      if (!active) {
        release();
        return;
      }
      setSlotReady(true);
    });

    return () => {
      active = false;
      setSlotReady(false);
      cancel();
    };
  }, [enabled, inView, isExhausted, displayUrl, acceptedUrl, sequence, cacheKey]);

  const shouldLoad =
    enabled &&
    inView &&
    !isExhausted &&
    !acceptedUrl &&
    !displayUrl &&
    slotReady;
  const loaderUrl = shouldLoad ? (sequence[urlIndex] ?? null) : null;
  currentUrlRef.current = loaderUrl;
  urlIndexRef.current = urlIndex;

  const failCurrent = useCallback((failedUrl) => {
    const expected = currentUrlRef.current;
    if (failedUrl && expected && !sameImageUrl(failedUrl, expected)) return;

    const index = urlIndexRef.current;
    const lastIndex = sequenceLengthRef.current - 1;
    if (index < lastIndex) {
      const next = index + 1;
      urlIndexRef.current = next;
      setUrlIndex(next);
      return;
    }

    rememberResolved(cacheKeyRef.current, EXHAUSTED_SENTINEL);
    setExhausted(true);
  }, []);

  const settleFromImage = useCallback(
    (img) => {
      if (!img) return;

      const src = img.currentSrc || img.src;
      if (!src || handledSrcRef.current === src) return;

      const expected = currentUrlRef.current;
      if (expected && !sameImageUrl(src, expected)) return;

      if (!isAcceptableThumbnail(img, src)) {
        handledSrcRef.current = src;
        failCurrent(src);
        return;
      }

      handledSrcRef.current = src;
      setAcceptedUrl(src);
    },
    [failCurrent],
  );

  const onError = useCallback(
    (e) => {
      const img = e?.currentTarget ?? e?.target;
      const failedUrl = img ? img.currentSrc || img.src : currentUrlRef.current;
      if (failedUrl) handledSrcRef.current = failedUrl;
      failCurrent(failedUrl);
    },
    [failCurrent],
  );

  const onLoad = useCallback(
    (e) => {
      settleFromImage(e.target);
    },
    [settleFromImage],
  );

  // A resolved URL (often hydrated from the session cache) failed to render.
  // Evict it and restart the fallback sequence once; a second failure gives up.
  const onDisplayError = useCallback(() => {
    resolvedThumbCache.delete(cacheKeyRef.current);
    schedulePersistCache();
    if (displayRecoveryRef.current) {
      setExhausted(true);
      return;
    }
    displayRecoveryRef.current = true;
    handledSrcRef.current = null;
    urlIndexRef.current = 0;
    setUrlIndex(0);
    setAcceptedUrl(null);
    setLoadedUrl(null);
    setExhausted(false);
  }, []);

  useEffect(() => {
    if (!loaderUrl) return;
    const img = imgRef.current;
    if (!img?.complete) return;
    settleFromImage(img);
  }, [loaderUrl, settleFromImage]);

  // Warm the maxres candidate in parallel with the loader fetch so the
  // post-accept probe below resolves from cache instead of serializing
  // two network round-trips before the first reveal.
  useEffect(() => {
    if (!loaderUrl || loadedUrl) return;
    const upgradeUrl = getMaxResUpgradeUrl(loaderUrl);
    if (!upgradeUrl) return;
    const prefetch = new Image();
    prefetch.decoding = "async";
    prefetch.src = upgradeUrl;
  }, [loaderUrl, loadedUrl]);

  // Resolve maxres BEFORE first paint so hq/mq (4:3) never flash then swap to 16:9.
  useEffect(() => {
    // loadedUrl set means the final decision is already known (hydrated or
    // previously resolved) — never re-probe it.
    if (!enabled || !acceptedUrl || loadedUrl) return undefined;

    const upgradeUrl = getMaxResUpgradeUrl(acceptedUrl);
    if (!upgradeUrl) {
      rememberResolved(cacheKeyRef.current, acceptedUrl);
      setLoadedUrl(acceptedUrl);
      return undefined;
    }

    let cancelled = false;
    const probe = new Image();
    probe.decoding = "async";

    const finish = (url) => {
      if (cancelled) return;
      rememberResolved(cacheKeyRef.current, url);
      handledSrcRef.current = url;
      setLoadedUrl(url);
    };

    probe.onload = () => {
      if (cancelled) return;
      if (isAcceptableThumbnail(probe, upgradeUrl)) {
        finish(upgradeUrl);
        return;
      }
      finish(acceptedUrl);
    };
    probe.onerror = () => {
      finish(acceptedUrl);
    };
    probe.src = upgradeUrl;
    if (probe.complete && probe.naturalWidth > 0) {
      probe.onload();
    }

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
      probe.src = "";
    };
  }, [enabled, acceptedUrl, loadedUrl]);

  return {
    ref,
    imgRef,
    currentUrl: loaderUrl,
    loadedUrl: displayUrl,
    exhausted: isExhausted,
    onError,
    onLoad,
    onDisplayError,
  };
}
