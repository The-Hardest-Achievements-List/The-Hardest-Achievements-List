import { isGroupedDuplicate } from "./groupDuplicates.js";
import { withGlobalRank } from "./leaderboard.js";

const COUNTRY_NAME_FORMATTER =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function normalizeCountryCode(value) {
  if (typeof value === "string") {
    const code = value.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  }
  if (value && typeof value === "object") {
    return normalizeCountryCode(value.code);
  }
  return null;
}

export function resolvePlayerCountry(playerCountries, player) {
  if (!player || player === "-" || !playerCountries) return null;
  return normalizeCountryCode(playerCountries[player]);
}

export function getCountryName(code) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "Unknown";
  return COUNTRY_NAME_FORMATTER?.of(normalized) ?? normalized;
}

export function countryCodeToFlag(code) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "";
  return [...normalized]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function compareCountryByXp(a, b) {
  if (a.totalXP !== b.totalXP) return b.totalXP - a.totalXP;
  const rankA = a.bestRank ?? Number.POSITIVE_INFINITY;
  const rankB = b.bestRank ?? Number.POSITIVE_INFINITY;
  if (rankA !== rankB) return rankA - rankB;
  return getCountryName(a.code).localeCompare(getCountryName(b.code));
}

export function buildCountryBoard(playerBoard, playerCountries) {
  const grouped = new Map();

  for (const player of playerBoard) {
    const countryCode = resolvePlayerCountry(playerCountries, player.name);
    if (!countryCode) continue;

    if (!grouped.has(countryCode)) {
      grouped.set(countryCode, {
        code: countryCode,
        name: getCountryName(countryCode),
        flag: countryCodeToFlag(countryCode),
        players: [],
        achievements: [],
        totalXP: 0,
        best: null,
        bestRank: null,
        achievementCount: 0,
      });
    }

    const country = grouped.get(countryCode);
    country.players.push(player);
    country.totalXP =
      Math.round((country.totalXP + (player.totalXP ?? 0)) * 100) / 100;

    for (const achievement of player.achievements) {
      country.achievements.push(achievement);
      country.achievementCount += 1;

      const rank = achievement.listPosition;
      if (rank != null && (country.bestRank == null || rank < country.bestRank)) {
        country.bestRank = rank;
        country.best = achievement;
      }
    }
  }

  return withGlobalRank(
    [...grouped.values()]
      .map((country) => ({
        ...country,
        players: [...country.players].sort((a, b) => b.totalXP - a.totalXP),
        achievements: [...country.achievements].sort(
          (a, b) => a.listPosition - b.listPosition,
        ),
      }))
      .sort(compareCountryByXp),
  );
}
