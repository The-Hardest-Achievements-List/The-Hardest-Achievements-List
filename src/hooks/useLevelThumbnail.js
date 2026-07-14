import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getThumbnailUrlSequence } from "../utils/format";

const MIN_THUMBNAIL_DIMENSION = 200;

export function useLevelThumbnail({
  thumbnail,
  showcaseVideo,
  video,
  levelID,
  lazy = true,
  enabled = true,
}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(!lazy);
  const [urlIndex, setUrlIndex] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [exhausted, setExhausted] = useState(false);

  const sequence = useMemo(() => {
    if (!enabled) return [];
    return getThumbnailUrlSequence(thumbnail, showcaseVideo, video, levelID);
  }, [thumbnail, showcaseVideo, video, levelID, enabled]);

  useEffect(() => {
    setUrlIndex(0);
    setLoadedUrl(null);
    setExhausted(false);
  }, [sequence]);

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
        if (entry.isIntersecting) setInView(true);
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy, enabled, sequence]);

  const shouldLoad = enabled && inView && !exhausted;
  const currentUrl = shouldLoad ? (sequence[urlIndex] ?? null) : null;

  const onError = useCallback(() => {
    setLoadedUrl(null);
    setUrlIndex((prev) => {
      if (prev < sequence.length - 1) return prev + 1;
      setExhausted(true);
      return prev;
    });
  }, [sequence.length]);

  const onLoad = useCallback(
    (e) => {
      const { naturalWidth, naturalHeight } = e.target;
      if (
        naturalWidth === 0 ||
        naturalHeight === 0 ||
        (naturalWidth < MIN_THUMBNAIL_DIMENSION &&
          naturalHeight < MIN_THUMBNAIL_DIMENSION)
      ) {
        onError();
        return;
      }

      setLoadedUrl(e.target.currentSrc || e.target.src);
    },
    [onError],
  );

  return {
    ref,
    currentUrl,
    loadedUrl,
    onError,
    onLoad,
  };
}
