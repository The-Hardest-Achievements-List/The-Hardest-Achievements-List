function normalizeDuplicateKey(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function getDuplicateParentId(achievement) {
  return achievement?.duplicateOf;
}

export function isDuplicateAchievement(achievement) {
  return getDuplicateParentId(achievement) !== undefined;
}

export function getAchievementKey(achievement) {
  return normalizeDuplicateKey(achievement?.name);
}
export function groupAchievementsByDuplicates(achievements) {
  const duplicatesByParent = new Map();
  achievements.forEach(achievement => {
    const parentRef = getDuplicateParentId(achievement);
    if (parentRef) {
      const normalizedParentRef = normalizeDuplicateKey(parentRef);
      if (!duplicatesByParent.has(normalizedParentRef)) {
        duplicatesByParent.set(normalizedParentRef, []);
      }
      duplicatesByParent.get(normalizedParentRef).push(achievement);
    }
  });
  const mainAchievements = [];

  achievements.forEach(achievement => {
    const isDuplicate = isDuplicateAchievement(achievement);

    if (!isDuplicate) {
      const parentKey = getAchievementKey(achievement);
      const children = duplicatesByParent.get(parentKey) || [];
      const item = {
        ...achievement,
        duplicates: children,
        hasDuplicates: children.length > 0,
      };

      mainAchievements.push(item);
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