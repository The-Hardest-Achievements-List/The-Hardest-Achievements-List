import { useEffect, useLayoutEffect, useState } from "react";
import { getThumbnailSources } from "../utils/format";
import { useLevelThumbnail } from "../hooks/useLevelThumbnail";

function ThumbnailPane({
  thumbnail,
  showcaseVideo = null,
  video = null,
  levelID = null,
  lazy = false,
  enabled = true,
  alt = "",
  className,
  pendingClassName,
  onLoadedUrl,
}) {
  const { ref, imgRef, currentUrl, loadedUrl, onError, onLoad } =
    useLevelThumbnail({
      thumbnail,
      showcaseVideo,
      video,
      levelID,
      lazy,
      enabled,
    });

  // Only swap the visible frame after the URL has fully decoded.
  // Keeps the previous frame during maxres upgrades / slow live CDN loads
  // so we never paint an intrinsic-size flash.
  const [paintSrc, setPaintSrc] = useState(null);

  useLayoutEffect(() => {
    onLoadedUrl?.(loadedUrl ?? null);
  }, [loadedUrl, onLoadedUrl]);

  useEffect(() => {
    if (!loadedUrl) {
      setPaintSrc(null);
      return undefined;
    }

    let cancelled = false;
    const probe = new Image();
    probe.decoding = "async";

    const promote = () => {
      if (!cancelled) setPaintSrc(loadedUrl);
    };

    probe.onload = () => {
      if (typeof probe.decode === "function") {
        probe.decode().then(promote).catch(promote);
      } else {
        promote();
      }
    };
    probe.onerror = () => {
      // Fall back to whatever the hook accepted; DOM img path still handles retries.
      promote();
    };
    probe.src = loadedUrl;
    if (probe.complete && probe.naturalWidth > 0) {
      promote();
    }

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [loadedUrl]);

  const thumbVisible = Boolean(paintSrc);

  return (
    <div ref={ref} className={className}>
      {/* Hidden loader: drives fallbacks / acceptance in the hook. */}
      {currentUrl ? (
        <img
          ref={imgRef}
          src={currentUrl}
          alt=""
          decoding="async"
          onError={onError}
          onLoad={onLoad}
          className={pendingClassName}
          aria-hidden="true"
        />
      ) : null}
      {/* Visible frame: only updated after decode, keeps prior frame while upgrading. */}
      {paintSrc ? <img src={paintSrc} alt={alt} decoding="async" /> : null}
      {!thumbVisible && <div className="card__thumb-placeholder" />}
    </div>
  );
}

export default function AchievementThumbnail({
  achievement,
  className = "card__thumb",
  fadeClassName = "card__thumb-fade",
  pendingClassName = "card__thumb-img--pending",
  lazy = false,
  alt = "",
  onLoadedUrl,
  children = null,
}) {
  const sources = getThumbnailSources(achievement?.thumbnail);
  const isComposite = sources.length >= 2;

  if (!isComposite) {
    return (
      <div className={className}>
        <ThumbnailPane
          className="card__thumb-pane"
          thumbnail={achievement?.thumbnail}
          showcaseVideo={achievement?.showcaseVideo}
          video={achievement?.video}
          levelID={achievement?.levelID}
          lazy={lazy}
          alt={alt}
          pendingClassName={pendingClassName}
          onLoadedUrl={onLoadedUrl}
        />
        <div className={fadeClassName} />
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${className} ${className}--composite`}
      style={{ "--thumb-count": sources.length }}
    >
      {sources.map((src, index) => (
        <ThumbnailPane
          key={`${index}:${src}`}
          className="card__thumb-pane"
          thumbnail={src}
          lazy={lazy}
          alt={index === 0 ? alt : ""}
          pendingClassName={pendingClassName}
          onLoadedUrl={index === 0 ? onLoadedUrl : undefined}
        />
      ))}
      {sources.slice(1).map((_, index) => (
        <div
          key={`split-${index}`}
          className="card__thumb-split"
          style={{ "--split-index": index + 1 }}
          aria-hidden="true"
        />
      ))}
      <div className={fadeClassName} />
      {children}
    </div>
  );
}
