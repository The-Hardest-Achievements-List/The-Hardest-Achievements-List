function normalizeDuplicateKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function getDuplicateParentId(achievement) {
  return achievement?.duplicateOf;
}

export function isDuplicateAchievement(achievement) {
  const parentRef = getDuplicateParentId(achievement);
  return parentRef != null && parentRef !== "";
}

export function getAchievementKey(achievement) {
  return normalizeDuplicateKey(achievement?.name);
}

function getParentKeysInList(achievements) {
  return new Set(
    achievements
      .filter((achievement) => !isDuplicateAchievement(achievement))
      .map((achievement) => getAchievementKey(achievement)),
  );
}

export function isGroupedDuplicate(achievement, achievements) {
  const parentRef = getDuplicateParentId(achievement);
  if (!parentRef) return false;
  return getParentKeysInList(achievements).has(normalizeDuplicateKey(parentRef));
}

export function groupAchievementsByDuplicates(achievements) {
  if (!Array.isArray(achievements)) {
    return { mainAchievements: [] };
  }

  const parentKeysInList = getParentKeysInList(achievements);
  const duplicatesByParent = new Map();

  achievements.forEach((achievement) => {
    const parentRef = getDuplicateParentId(achievement);
    if (!parentRef) return;

    const normalizedParentRef = normalizeDuplicateKey(parentRef);
    if (!parentKeysInList.has(normalizedParentRef)) return;

    if (!duplicatesByParent.has(normalizedParentRef)) {
      duplicatesByParent.set(normalizedParentRef, []);
    }
    duplicatesByParent.get(normalizedParentRef).push(achievement);
  });

  const mainAchievements = [];

  achievements.forEach((achievement) => {
    if (!isDuplicateAchievement(achievement)) {
      const parentKey = getAchievementKey(achievement);
      const children = duplicatesByParent.get(parentKey) || [];
      mainAchievements.push({
        ...achievement,
        duplicates: children,
        hasDuplicates: children.length > 0,
      });
      return;
    }

    const parentKey = normalizeDuplicateKey(getDuplicateParentId(achievement));
    if (!parentKeysInList.has(parentKey)) {
      mainAchievements.push({
        ...achievement,
        duplicates: [],
        hasDuplicates: false,
      });
    }
  });

  return {
    mainAchievements,
  };
}
export function getDuplicatesForAchievement(achievementName, achievements) {
  const normalizedParentRef = normalizeDuplicateKey(achievementName);
  return achievements.filter(a => normalizeDuplicateKey(getDuplicateParentId(a)) === normalizedParentRef);
}
