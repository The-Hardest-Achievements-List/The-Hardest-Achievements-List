let cache = null;
let pending = null;

/**
 * Lazily load the heavy list JSON bundles as one dynamic chunk.
 * Prefer starting this from preload-list-data.js so it overlaps App boot.
 */
export const loadListData = () => {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = import("./listBundle.js")
    .then((mod) => {
      cache = mod.default;
      pending = null;
      return cache;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });

  return pending;
};

export const getCachedListData = () => cache;

export const buildDataMap = (listData) => {
  if (!listData) return null;
  return {
    classic: {
      MAIN: listData.achievements,
      LEGACY: listData.legacy,
      PENDING: listData.pending,
      TIMELINE: listData.timeline,
    },
    platformer: {
      MAIN: listData.platformers,
      LEGACY: [],
      PENDING: listData.platformerPending,
      TIMELINE: listData.platformerTimeline,
    },
  };
};
