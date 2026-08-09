import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getThumbnailUrlSequence } from "../utils/format";

const MIN_THUMBNAIL_DIMENSION = 200;
const MAX_CONCURRENT_THUMB_LOADS = 10;
const RESOLVED_CACHE_LIMIT = 500;
const EXHAUSTED_SENTINEL = "";

const resolvedThumbCache = new Map();

let activeThumbLoads = 0;
const thumbLoadWaiters = [];

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
};

const isPrevterSmallThumb = (src) =>
  typeof src === "string" &&
  src.includes("levelthumbs.prevter.me/thumbnail/") &&
  /\/small\/?$/.test(src);

/** YouTube thumbs can decode as 120×90 stubs — keep those hidden until accepted. */
export const isRiskyThumbnailUrl = (url) =>
  typeof url === "string" && url.includes("img.youtube.com/vi/");

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
  const [loadedUrl, setLoadedUrl] = useState(cacheHit.loadedUrl);
  const [exhausted, setExhausted] = useState(cacheHit.exhausted);
  const [syncKey, setSyncKey] = useState(cacheKey);

  // Hydrate from the session cache during render so remounts don't flash empty.
  if (syncKey !== cacheKey) {
    setSyncKey(cacheKey);
    setUrlIndex(cacheHit.urlIndex);
    setLoadedUrl(cacheHit.loadedUrl);
    setExhausted(cacheHit.exhausted);
    handledSrcRef.current = cacheHit.loadedUrl;
    urlIndexRef.current = cacheHit.urlIndex;
  }

  const displayUrl = loadedUrl ?? cacheHit.loadedUrl;
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
  }, [enabled, inView, isExhausted, displayUrl, sequence, cacheKey]);

  const shouldLoad =
    enabled && inView && !isExhausted && (slotReady || Boolean(displayUrl));
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
      rememberResolved(cacheKeyRef.current, src);
      setLoadedUrl(src);
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

  useEffect(() => {
    if (!loaderUrl) return;
    const img = imgRef.current;
    if (!img?.complete) return;
    settleFromImage(img);
  }, [loaderUrl, settleFromImage]);

  return {
    ref,
    imgRef,
    currentUrl: loaderUrl,
    loadedUrl: displayUrl,
    exhausted: isExhausted,
    onError,
    onLoad,
  };
}
