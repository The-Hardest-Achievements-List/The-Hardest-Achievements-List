function normalizeDuplicateKey(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function getAchievementTags(achievement) {
  const source = Array.isArray(achievement?.tags)
    ? achievement.tags
    : typeof achievement?.tags === "string"
      ? achievement.tags.split(/\s*,\s*/)
      : [];

  return source
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasTag(achievement, tagName) {
  return getAchievementTags(achievement).includes(tagName);
}

/**
 * Normalize duplicateOf (string | string[] | null) into a unique list of parent names.
 */
export function getDuplicateParentIds(achievement) {
  const raw = achievement?.duplicateOf;
  if (raw == null || raw === "") return [];

  const values = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const parents = [];

  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeDuplicateKey(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    parents.push(trimmed);
  }

  return parents;
}

export function isDuplicateAchievement(achievement) {
  return getDuplicateParentIds(achievement).length > 0;
}

export function getAchievementKey(achievement) {
  return normalizeDuplicateKey(achievement?.name);
}

export function getParentKeysInList(achievements) {
  return new Set(
    achievements
      .filter((achievement) => !isDuplicateAchievement(achievement))
      .map((achievement) => getAchievementKey(achievement)),
  );
}

/** True when at least one duplicateOf parent exists in the same list. */
export function isSameListVariant(
  achievement,
  achievements,
  parentKeys = null,
) {
  const parentIds = getDuplicateParentIds(achievement);
  if (parentIds.length === 0) return false;
  const keys = parentKeys ?? getParentKeysInList(achievements);
  return parentIds.some((parentId) =>
    keys.has(normalizeDuplicateKey(parentId)),
  );
}

/**
 * Stamp `isGroupedVariant` on every same-list variant.
 * Annotate each list separately before merging (pending ↔ main replacements
 * must not look like same-list variants on a combined array).
 */
export function annotateGroupedVariants(achievements) {
  if (!Array.isArray(achievements)) return [];
  const parentKeys = getParentKeysInList(achievements);
  let changed = false;

  const next = achievements.map((entry) => {
    const grouped = isSameListVariant(entry, achievements, parentKeys);
    if (entry?.isGroupedVariant === grouped) return entry;
    changed = true;
    return {
      ...entry,
      isGroupedVariant: grouped,
    };
  });

  return changed ? next : achievements;
}

/** @deprecated Use annotateGroupedVariants. */
export function annotateVariantProximity(achievements) {
  return annotateGroupedVariants(achievements);
}

/**
 * Same-list variant: always nested under its parent, rankless, parent-tier XP.
 * Prefers `isGroupedVariant` stamps from per-list annotation.
 */
export function isGroupedDuplicate(
  achievement,
  achievements,
  parentKeys = null,
) {
  if (achievement?.isGroupedVariant === true) return true;
  if (achievement?.isGroupedVariant === false) return false;
  return isSameListVariant(achievement, achievements, parentKeys);
}

export function isPendingListSource(entry) {
  const src = entry?._src;
  return src === "pending" || src === "platformerpending";
}

export function isMainListSource(entry) {
  const src = entry?._src;
  return src === "classic" || src === "platformer" || src === "main";
}

/** Replacements only link pending ↔ main, never same-list. */
export function isCrossListReplacementPair(parent, child) {
  if (!parent || !child) return false;

  if (parent._src != null && child._src != null) {
    const parentPending = isPendingListSource(parent);
    const childPending = isPendingListSource(child);
    const parentMain = isMainListSource(parent);
    const childMain = isMainListSource(child);
    return (
      (parentMain && childPending) || (parentPending && childMain)
    );
  }

  return false;
}

/** Parent must be Pending Removal and Progress or Consistency. */
export function isReplacementEligibleParent(parent) {
  if (!parent) return false;
  if (!hasTag(parent, "Pending Removal")) return false;
  return hasTag(parent, "Progress") || hasTag(parent, "Consistency");
}

/**
 * Level IDs must match when both are set. Null on either side skips the check.
 */
export function sharesLevelIdForReplacement(parent, child) {
  const parentId = parent?.levelID;
  const childId = child?.levelID;
  if (parentId == null || childId == null) return true;
  return parentId === childId;
}

/**
 * A duplicateOf child is a "replacement" only when:
 * - parent is Pending Removal + Progress/Consistency
 * - level IDs match when present
 * - the pair is pending ↔ main (same-list stays a normal variant)
 */
export function isReplacementDuplicate(parent, child) {
  if (!parent || !child) return false;
  if (!isDuplicateAchievement(child)) return false;
  if (!isCrossListReplacementPair(parent, child)) return false;
  if (!isReplacementEligibleParent(parent)) return false;
  return sharesLevelIdForReplacement(parent, child);
}

function findParentInList(parentRef, list) {
  if (!parentRef || !Array.isArray(list)) return null;
  const parentKey = normalizeDuplicateKey(parentRef);
  return (
    list.find(
      (entry) =>
        !isDuplicateAchievement(entry) &&
        getAchievementKey(entry) === parentKey,
    ) ?? null
  );
}

/**
 * Main-list parents that this pending child validly replaces.
 * Supports duplicateOf as a string or string[].
 */
export function getCrossListReplacementParents(child, mainList, listSrc = {}) {
  if (!isDuplicateAchievement(child)) return [];

  const taggedChild = {
    ...child,
    _src: child._src ?? listSrc.pendingSrc ?? "pending",
  };

  const parents = [];
  for (const parentRef of getDuplicateParentIds(child)) {
    const parent = findParentInList(parentRef, mainList);
    if (!parent) continue;

    const taggedParent = {
      ...parent,
      _src: parent._src ?? listSrc.mainSrc ?? "classic",
    };
    if (!isReplacementDuplicate(taggedParent, taggedChild)) continue;
    parents.push(parent);
  }
  return parents;
}

/**
 * True when a pending entry is a valid replacement of at least one main-list parent.
 */
export function isCrossListReplacementChild(child, mainList, listSrc = {}) {
  return getCrossListReplacementParents(child, mainList, listSrc).length > 0;
}

function annotateSameListChildren(children) {
  // Main↔main (and pending↔pending) are always normal variants.
  return children.map((child) => {
    if (!child?.isReplacement) return child;
    const { isReplacement: _ignored, ...rest } = child;
    return rest;
  });
}

function annotateCrossListReplacements(parent, children, listSrc) {
  const taggedParent = {
    ...parent,
    _src: parent._src ?? listSrc.mainSrc ?? "classic",
  };

  return children.map((child) => {
    const taggedChild = {
      ...child,
      _src: child._src ?? listSrc.pendingSrc ?? "pending",
    };
    if (!isReplacementDuplicate(taggedParent, taggedChild)) return child;
    if (child.isReplacement && child._src) return child;
    return { ...taggedChild, isReplacement: true };
  });
}

export function getDuplicateGroupLabel(duplicates) {
  if (!Array.isArray(duplicates) || duplicates.length === 0) {
    return { text: "0 variants", count: 0 };
  }

  const replacementCount = duplicates.filter(
    (duplicate) => duplicate?.isReplacement,
  ).length;
  const variantCount = duplicates.length - replacementCount;

  const parts = [];
  if (variantCount > 0) {
    parts.push(`${variantCount} variant${variantCount !== 1 ? "s" : ""}`);
  }
  if (replacementCount > 0) {
    parts.push(
      `${replacementCount} replacement${replacementCount !== 1 ? "s" : ""}`,
    );
  }

  return {
    text: parts.join(", ") || `${duplicates.length} variants`,
    count: duplicates.length,
    variantCount,
    replacementCount,
  };
}

/**
 * @param {object[]} achievements - current list entries
 * @param {object} [options]
 * @param {'main'|'pending'|null} [options.listKind]
 * @param {object[]} [options.otherList] - pending when on main, main when on pending
 * @param {string} [options.mainSrc]
 * @param {string} [options.pendingSrc]
 */
export function groupAchievementsByDuplicates(achievements, options = {}) {
  if (!Array.isArray(achievements)) {
    return { mainAchievements: [] };
  }

  const {
    listKind = null,
    otherList = [],
    mainSrc = "classic",
    pendingSrc = "pending",
  } = options;
  const listSrc = { mainSrc, pendingSrc };
  const other = Array.isArray(otherList) ? otherList : [];

  const parentKeysInList = getParentKeysInList(achievements);
  const duplicatesByParent = new Map();

  achievements.forEach((achievement) => {
    for (const parentRef of getDuplicateParentIds(achievement)) {
      const normalizedParentRef = normalizeDuplicateKey(parentRef);
      if (!parentKeysInList.has(normalizedParentRef)) continue;

      if (!duplicatesByParent.has(normalizedParentRef)) {
        duplicatesByParent.set(normalizedParentRef, []);
      }
      duplicatesByParent.get(normalizedParentRef).push(achievement);
    }
  });

  const crossReplacementsByParent = new Map();
  if (listKind === "main" && other.length > 0) {
    other.forEach((candidate) => {
      const parents = getCrossListReplacementParents(
        candidate,
        achievements,
        listSrc,
      );
      for (const parent of parents) {
        const parentKey = getAchievementKey(parent);
        if (!crossReplacementsByParent.has(parentKey)) {
          crossReplacementsByParent.set(parentKey, []);
        }
        crossReplacementsByParent.get(parentKey).push(candidate);
      }
    });
  }

  const mainAchievements = [];

  achievements.forEach((achievement) => {
    if (!isDuplicateAchievement(achievement)) {
      const parentKey = getAchievementKey(achievement);
      const sameListChildren = annotateSameListChildren(
        duplicatesByParent.get(parentKey) || [],
      );
      const crossChildren =
        listKind === "main"
          ? annotateCrossListReplacements(
              achievement,
              crossReplacementsByParent.get(parentKey) || [],
              listSrc,
            )
          : [];
      const children = [...sameListChildren, ...crossChildren];

      if (children.length === 0) {
        // Keep the original reference so memoized cards can skip re-renders.
        mainAchievements.push(achievement);
        return;
      }
      mainAchievements.push({
        ...achievement,
        duplicates: children,
        hasDuplicates: true,
      });
      return;
    }

    // Same-list variants only nest under their parent — never as standalone cards.
    if (isSameListVariant(achievement, achievements, parentKeysInList)) {
      return;
    }

    // Cross-list replacements still appear on pending as normal cards.
    mainAchievements.push(achievement);
  });

  return {
    mainAchievements,
  };
}
