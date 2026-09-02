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
  fadeClassName = null,
  children = null,
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

  // Hook withholds loadedUrl until maxres (or fallback) is resolved, so a
  // 4:3 hqdefault never paints and then jumps to 16:9.
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
        />
      ) : loadedUrl ? (
        <img src={loadedUrl} alt={alt} decoding="async" />
      ) : null}
      {!thumbVisible && <div className="card__thumb-placeholder" />}
      {fadeClassName ? <div className={fadeClassName} /> : null}
      {children}
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

  // Single-thumb: no inner pane — img sits directly in .card__thumb like before
  // the composite refactor, so height / object-fit stay stable.
  if (!isComposite) {
    return (
      <ThumbnailPane
        className={className}
        thumbnail={achievement?.thumbnail}
        showcaseVideo={achievement?.showcaseVideo}
        video={achievement?.video}
        levelID={achievement?.levelID}
        lazy={lazy}
        alt={alt}
        pendingClassName={pendingClassName}
        onLoadedUrl={onLoadedUrl}
        fadeClassName={fadeClassName}
      >
        {children}
      </ThumbnailPane>
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
