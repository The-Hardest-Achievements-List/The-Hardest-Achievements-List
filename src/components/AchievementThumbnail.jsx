import { useLayoutEffect } from "react";
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

  useLayoutEffect(() => {
    onLoadedUrl?.(loadedUrl ?? null);
  }, [loadedUrl, onLoadedUrl]);

  // Only reveal after accept/cache hit. Painting before decode lets the
  // intrinsic image size flash uncropped (left edge) until load or remount.
  const thumbVisible = Boolean(loadedUrl);

  return (
    <div ref={ref} className={className}>
      {currentUrl ? (
        <img
          ref={imgRef}
          src={currentUrl}
          alt={alt}
          decoding="async"
          onError={onError}
          onLoad={onLoad}
          className={thumbVisible ? undefined : pendingClassName}
          width="100%"
          height="100%"
        />
      ) : loadedUrl ? (
        <img
          src={loadedUrl}
          alt={alt}
          decoding="async"
          width="100%"
          height="100%"
        />
      ) : null}
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
