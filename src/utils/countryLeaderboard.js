import {
  compareByXpAndBestRank,
  isShadowRealmRow,
  withCompetitionRank,
  withGlobalRank,
} from "./leaderboard.js";
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

function compareCountryBySubmissions(a, b) {
  if (b.pts !== a.pts) return b.pts - a.pts;
  return getCountryName(a.code).localeCompare(getCountryName(b.code));
}

function sortAchievementsByListPosition(achievements) {
  return [...achievements].sort((a, b) => {
    // Null/undefined positions sort last, deterministically.
    const posA = a.listPosition ?? null;
    const posB = b.listPosition ?? null;
    if (posA == null && posB == null) return 0;
    if (posA == null) return 1;
    if (posB == null) return -1;
    return posA - posB;
  });
}

export function buildCountryBoard(playerBoard, playerCountries) {
  const grouped = new Map();

  for (const player of playerBoard) {
    if (isShadowRealmRow(player)) continue;
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
        achievements: sortAchievementsByListPosition(country.achievements),
      }))
      .sort(compareCountryByXp),
  );
}

/** Aggregate submitters into a country board scored by submission count. */
export function buildSubmissionCountryBoard(submissionBoard, playerCountries) {
  const grouped = new Map();

  for (const submitter of submissionBoard) {
    const countryCodes = resolvePlayerCountries(playerCountries, submitter.name);
    if (!countryCodes.length) continue;

    for (const countryCode of countryCodes) {
      if (!grouped.has(countryCode)) {
        grouped.set(countryCode, {
          code: countryCode,
          name: getCountryName(countryCode),
          submitters: [],
          submissions: [],
          pts: 0,
          totalXP: 0,
          best: null,
          bestRank: null,
          achievementCount: 0,
        });
      }

      const country = grouped.get(countryCode);
      country.submitters.push(submitter);
      country.pts += submitter.pts ?? 0;
      country.totalXP = country.pts;

      for (const submission of submitter.submissions ?? []) {
        country.submissions.push(submission);
        country.achievementCount += 1;

        const rank = submission.listPosition;
        if (rank != null && (country.bestRank == null || rank < country.bestRank)) {
          country.bestRank = rank;
          country.best = submission;
        }
      }
    }
  }

  return withCompetitionRank(
    [...grouped.values()]
      .map((country) => ({
        ...country,
        submitters: [...country.submitters].sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          return String(a.name ?? "").localeCompare(String(b.name ?? ""));
        }),
        submissions: sortAchievementsByListPosition(country.submissions),
      }))
      .sort(compareCountryBySubmissions),
    (row) => row.pts,
  );
}
