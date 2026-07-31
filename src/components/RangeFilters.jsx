export default function RangeFilters({
  showProgress = false,
  showHertz = false,
  progressFrom = "",
  progressTo = "",
  onProgressFromChange,
  onProgressToChange,
  hzMin = "",
  hzMax = "",
  onHzMinChange,
  onHzMaxChange,
}) {
  if (!showProgress && !showHertz) return null;

  return (
    <div className="hd__range-filters">
      {showProgress && (
        <div className="hd__range-row">
          <span className="hd__range-lbl">Progress %</span>
          <div className="hd__range-inputs">
            <input
              type="number"
              className="hd__range-input"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              placeholder="Start ≥"
              aria-label="Minimum progress start percent"
              value={progressFrom}
              onChange={(e) => onProgressFromChange?.(e.target.value)}
            />
            <span className="hd__range-sep" aria-hidden="true">
              –
            </span>
            <input
              type="number"
              className="hd__range-input"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              placeholder="End ≤"
              aria-label="Maximum progress end percent"
              value={progressTo}
              onChange={(e) => onProgressToChange?.(e.target.value)}
            />
          </div>
        </div>
      )}
      {showHertz && (
        <div className="hd__range-row">
          <span className="hd__range-lbl">Hertz</span>
          <div className="hd__range-inputs">
            <input
              type="number"
              className="hd__range-input"
              inputMode="numeric"
              min={0}
              placeholder="Hz ≥"
              aria-label="Minimum hertz"
              value={hzMin}
              onChange={(e) => onHzMinChange?.(e.target.value)}
            />
            <span className="hd__range-sep" aria-hidden="true">
              –
            </span>
            <input
              type="number"
              className="hd__range-input"
              inputMode="numeric"
              min={0}
              placeholder="Hz ≤"
              aria-label="Maximum hertz"
              value={hzMax}
              onChange={(e) => onHzMaxChange?.(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
