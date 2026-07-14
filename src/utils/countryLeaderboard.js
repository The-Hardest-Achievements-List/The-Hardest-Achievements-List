import { compareByXpAndBestRank, withGlobalRank } from "./leaderboard.js";
import {
  normalizeCountryCode,
  normalizeCountryCodes,
  resolvePlayerCountries,
  resolvePlayerCountry,
} from "./playerCountries.js";

export {
  normalizeCountryCode,
  normalizeCountryCodes,
  resolvePlayerCountries,
  resolvePlayerCountry,
};

const COUNTRY_NAME_FORMATTER =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function getCountryName(code) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "Unknown";
  return COUNTRY_NAME_FORMATTER?.of(normalized) ?? normalized;
}

function compareCountryByXp(a, b) {
  return (
    compareByXpAndBestRank(a, b) ||
    getCountryName(a.code).localeCompare(getCountryName(b.code))
  );
}

export function buildCountryBoard(playerBoard, playerCountries) {
  const grouped = new Map();

  for (const player of playerBoard) {
    const countryCodes = resolvePlayerCountries(playerCountries, player.name);
    if (!countryCodes.length) continue;

    for (const countryCode of countryCodes) {
      if (!grouped.has(countryCode)) {
        grouped.set(countryCode, {
          code: countryCode,
          name: getCountryName(countryCode),
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
  }

  return withGlobalRank(
    [...grouped.values()]
      .map((country) => ({
        ...country,
        players: [...country.players].sort((a, b) => b.totalXP - a.totalXP),
        achievements: [...country.achievements].sort((a, b) => {
          // Null/undefined positions sort last, deterministically.
          const posA = a.listPosition ?? null;
          const posB = b.listPosition ?? null;
          if (posA == null && posB == null) return 0;
          if (posA == null) return 1;
          if (posB == null) return -1;
          return posA - posB;
        }),
      }))
      .sort(compareCountryByXp),
  );
}
