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

/** Minimum list-spot gap outside a parent’s variant chain to rank separately. */
export const SEPARATE_VARIANT_MIN_DISTANCE = 2;

/**
 * For each parent, take its family (parent + same-list children), then grow a
 * contiguous chain from the parent up/down while the next list slot is still
 * in the family. Chain ends are the reference points; family members outside
 * that block (≥ SEPARATE_VARIANT_MIN_DISTANCE spots away) are distant.
 *
 * Classification is by list index so duplicate names do not collide.
 * A child linked to multiple parents is close if it sits in any parent’s chain
 * (mixed close-to-A / far-from-B should not occur in authored data).
 *
 * @returns {{ closeIndices: Set<number>, distantIndices: Set<number> }}
 */
export function classifyVariantsInList(achievements) {
  const closeIndices = new Set();
  const distantIndices = new Set();

  if (!Array.isArray(achievements) || achievements.length === 0) {
    return { closeIndices, distantIndices };
  }

  /** First non-duplicate entry index for each parent name. */
  const parentIndexByKey = new Map();
  /** parentKey -> child list indices */
  const childrenByParentKey = new Map();

  achievements.forEach((entry, index) => {
    const key = getAchievementKey(entry);
    if (
      key &&
      !isDuplicateAchievement(entry) &&
      !parentIndexByKey.has(key)
    ) {
      parentIndexByKey.set(key, index);
    }

    for (const parentRef of getDuplicateParentIds(entry)) {
      const parentKey = normalizeDuplicateKey(parentRef);
      if (!childrenByParentKey.has(parentKey)) {
        childrenByParentKey.set(parentKey, []);
      }
      childrenByParentKey.get(parentKey).push(index);
    }
  });

  for (const [parentKey, childIndices] of childrenByParentKey) {
    const parentIndex = parentIndexByKey.get(parentKey);
    if (parentIndex == null) continue;

    const familyIndices = new Set([parentIndex, ...childIndices]);

    let chainTop = parentIndex;
    let chainBottom = parentIndex;
    while (familyIndices.has(chainTop - 1)) chainTop -= 1;
    while (familyIndices.has(chainBottom + 1)) chainBottom += 1;

    for (const childIndex of childIndices) {
      if (childIndex >= chainTop && childIndex <= chainBottom) {
        closeIndices.add(childIndex);
        continue;
      }

      // Outside a maximal contiguous chain ⇒ always ≥ 2 spots from an end.
      distantIndices.add(childIndex);
    }
  }

  // Multi-parent: close to any parent wins over distant-from-another.
  for (const index of closeIndices) distantIndices.delete(index);

  return { closeIndices, distantIndices };
}

/**
 * Stamp `isCloseGroupedVariant` / `isDistantVariant` from raw list order.
 * Returns a new array; unchanged entries keep the same object reference.
 */
export function annotateVariantProximity(achievements) {
  if (!Array.isArray(achievements)) return [];
  const { closeIndices, distantIndices } = classifyVariantsInList(achievements);

  if (closeIndices.size === 0 && distantIndices.size === 0) {
    return achievements;
  }

  return achievements.map((entry, index) => {
    if (closeIndices.has(index)) {
      if (entry?.isCloseGroupedVariant === true && !entry?.isDistantVariant) {
        return entry;
      }
      return {
        ...entry,
        isCloseGroupedVariant: true,
        isDistantVariant: false,
      };
    }
    if (distantIndices.has(index)) {
      if (entry?.isDistantVariant === true && !entry?.isCloseGroupedVariant) {
        return entry;
      }
      return {
        ...entry,
        isDistantVariant: true,
        isCloseGroupedVariant: false,
      };
    }
    if (entry?.isCloseGroupedVariant || entry?.isDistantVariant) {
      const {
        isCloseGroupedVariant: _c,
        isDistantVariant: _d,
        ...rest
      } = entry;
      return rest;
    }
    return entry;
  });
}

function resolveEntryIndex(achievement, achievements) {
  if (!achievement || !Array.isArray(achievements)) return -1;
  const byRef = achievements.indexOf(achievement);
  if (byRef >= 0) return byRef;

  // Copies (after listRank annotation, etc.) lose referential identity.
  const key = getAchievementKey(achievement);
  if (!key) return -1;

  const wantParents = getDuplicateParentIds(achievement)
    .map(normalizeDuplicateKey)
    .sort()
    .join("\0");

  let found = -1;
  for (let index = 0; index < achievements.length; index += 1) {
    const entry = achievements[index];
    if (getAchievementKey(entry) !== key) continue;

    const gotParents = getDuplicateParentIds(entry)
      .map(normalizeDuplicateKey)
      .sort()
      .join("\0");
    if (gotParents !== wantParents) continue;

    if (
      achievement.player != null &&
      entry.player != null &&
      achievement.player !== entry.player
    ) {
      continue;
    }

    // Ambiguous duplicate names — refuse rather than guess wrong.
    if (found >= 0) return -1;
    found = index;
  }

  return found;
}

/**
 * Spots from a child to its parent’s contiguous variant chain
 * (0 if inside; otherwise distance to the nearer chain end). Null if unlinked.
 */
export function getDistanceToParentVariantChain(child, parent, achievements) {
  if (!child || !parent || !Array.isArray(achievements)) return null;

  const parentKey = getAchievementKey(parent);
  const childKey = getAchievementKey(child);
  if (!parentKey || !childKey) return null;

  let parentIndex = resolveEntryIndex(parent, achievements);
  if (parentIndex < 0) {
    parentIndex = achievements.findIndex(
      (entry) =>
        !isDuplicateAchievement(entry) &&
        getAchievementKey(entry) === parentKey,
    );
  }
  if (parentIndex < 0) return null;

  let childIndex = resolveEntryIndex(child, achievements);
  if (childIndex < 0) {
    childIndex = achievements.findIndex(
      (entry) => getAchievementKey(entry) === childKey,
    );
  }
  if (childIndex < 0) return null;

  const familyIndices = new Set([parentIndex]);
  achievements.forEach((entry, index) => {
    if (
      getDuplicateParentIds(entry).some(
        (parentRef) => normalizeDuplicateKey(parentRef) === parentKey,
      )
    ) {
      familyIndices.add(index);
    }
  });

  let chainTop = parentIndex;
  let chainBottom = parentIndex;
  while (familyIndices.has(chainTop - 1)) chainTop -= 1;
  while (familyIndices.has(chainBottom + 1)) chainBottom += 1;

  if (childIndex >= chainTop && childIndex <= chainBottom) return 0;
  if (childIndex < chainTop) return chainTop - childIndex;
  return childIndex - chainBottom;
}

/** Alias for getDistanceToParentVariantChain. */
export function getVariantListDistance(child, parent, achievements) {
  return getDistanceToParentVariantChain(child, parent, achievements);
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
 * Close same-list variant: inside a parent’s contiguous variant chain.
 * Nested-only (no own list rank / XP tier).
 *
 * Prefers proximity stamps so sorted/filtered copies stay correctly classified.
 */
export function isGroupedDuplicate(
  achievement,
  achievements,
  parentKeys = null,
) {
  if (achievement?.isCloseGroupedVariant === true) return true;
  if (achievement?.isDistantVariant === true) return false;
  if (!isSameListVariant(achievement, achievements, parentKeys)) return false;

  const index = resolveEntryIndex(achievement, achievements);
  if (index < 0) return false;

  const { closeIndices } = classifyVariantsInList(achievements);
  return closeIndices.has(index);
}

/**
 * Same-list variant outside every linked parent’s contiguous chain —
 * ranks as its own achievement, still nests under parent.
 */
export function isDistantVariant(
  achievement,
  achievements,
  parentKeys = null,
) {
  if (achievement?.isDistantVariant === true) return true;
  if (achievement?.isCloseGroupedVariant === true) return false;
  if (!isSameListVariant(achievement, achievements, parentKeys)) return false;

  const index = resolveEntryIndex(achievement, achievements);
  if (index < 0) return false;

  const { distantIndices } = classifyVariantsInList(achievements);
  return distantIndices.has(index);
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

    const linkedInList = isSameListVariant(
      achievement,
      achievements,
      parentKeysInList,
    );
    if (!linkedInList) {
      // Cross-list replacements still appear on pending as normal cards.
      mainAchievements.push(achievement);
      return;
    }

    // Use the precomputed stamp when present. Never recompute distance on a
    // sorted list — unranked close variants sit at the end and would look distant.
    if (isDistantVariant(achievement, achievements, parentKeysInList)) {
      // Keep the original reference when already stamped (memo-friendly).
      if (achievement.isDistantVariant === true) {
        mainAchievements.push(achievement);
      } else {
        mainAchievements.push({
          ...achievement,
          isDistantVariant: true,
        });
      }
    }
  });

  return {
    mainAchievements,
  };
}
