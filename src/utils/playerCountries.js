/**
 * Player → country helpers. Kept separate from leaderboard boards so
 * leaderboard.js and countryLeaderboard.js do not import each other.
 */
export function normalizeCountryCode(value) {
  if (typeof value === "string") {
    const code = value.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const code = normalizeCountryCode(entry);
      if (code) return code;
    }
    return null;
  }
  if (value && typeof value === "object") {
    return normalizeCountryCode(value.code);
  }
  return null;
}

export function normalizeCountryCodes(value) {
  if (Array.isArray(value)) {
    const codes = [];
    const seen = new Set();
    for (const entry of value) {
      const code = normalizeCountryCode(entry);
      if (!code || seen.has(code)) continue;
      seen.add(code);
      codes.push(code);
    }
    return codes;
  }

  const code = normalizeCountryCode(value);
  return code ? [code] : [];
}

export function resolvePlayerCountries(playerCountries, player) {
  if (!player || player === "-" || !playerCountries) return [];
  return normalizeCountryCodes(playerCountries[player]);
}

export function resolvePlayerCountry(playerCountries, player) {
  return resolvePlayerCountries(playerCountries, player)[0] ?? null;
}
