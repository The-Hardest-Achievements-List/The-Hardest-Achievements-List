import { normalizeCountryCode, normalizeCountryCodes } from "../utils/playerCountries";

const COUNTRY_NAME_FORMATTER =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function getFlagCountryName(code) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return "";
  return COUNTRY_NAME_FORMATTER?.of(normalized) ?? normalized;
}

export default function CountryFlag({
  code,
  className = "lb__flag-img",
  size = 18,
}) {
  const normalized = normalizeCountryCode(code);
  if (!normalized) return null;

  const height = Math.round(size * 0.75);

  return (
    <img
      src={`https://flagcdn.com/w40/${normalized.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${normalized.toLowerCase()}.png 2x`}
      alt=""
      className={className}
      width={size}
      height={height}
      loading="lazy"
      decoding="async"
    />
  );
}

/** Compact inline flags for dual nationality (no overflow trimming). */
export function CountryFlagRow({
  codes,
  size = 14,
  className,
  flagClassName,
}) {
  const normalized = Array.isArray(codes)
    ? codes.map(normalizeCountryCode).filter(Boolean)
    : normalizeCountryCodes(codes);

  if (!normalized.length) return null;

  const title = normalized.map(getFlagCountryName).filter(Boolean).join(", ");

  return (
    <span className={className} title={title} aria-label={title}>
      {normalized.map((code) => (
        <CountryFlag
          key={code}
          code={code}
          className={flagClassName}
          size={size}
        />
      ))}
    </span>
  );
}
