import { useRef } from "react";
import { formatDate, isValidDate, parseLengthBound } from "../utils/format";

function RangeRow({ label, children }) {
  return (
    <div className="hd__range-row">
      <span className="hd__range-lbl">{label}</span>
      <div className="hd__range-inputs">{children}</div>
    </div>
  );
}

function RangeInput({
  type = "number",
  inputMode,
  min,
  max,
  step,
  placeholder,
  ariaLabel,
  title,
  value,
  onChange,
  invalid = false,
}) {
  return (
    <input
      type={type}
      className={`hd__range-input${invalid ? " is-invalid" : ""}`}
      inputMode={inputMode}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function DatePickerInput({
  ariaLabel,
  title,
  placeholder,
  value,
  onChange,
}) {
  const inputRef = useRef(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    try {
      input.showPicker();
    } catch {
      // Some browsers require a direct user gesture on the input itself.
    }
  };

  const displayValue =
    value && isValidDate(value) ? formatDate(value) : placeholder;

  return (
    <div className="hd__date-picker">
      <span
        className={`hd__date-picker-display${value ? "" : " is-placeholder"}`}
        aria-hidden="true"
      >
        {displayValue}
      </span>
      <i className="fas fa-calendar-days hd__date-picker-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="date"
        className="hd__date-picker-native"
        aria-label={ariaLabel}
        title={title}
        value={value}
        onClick={openPicker}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

export default function RangeFilters({
  showDate = true,
  showLength = true,
  showProgress = false,
  showHertz = false,
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
  progressFrom = "",
  progressTo = "",
  onProgressFromChange,
  onProgressToChange,
  hzMin = "",
  hzMax = "",
  onHzMinChange,
  onHzMaxChange,
  lengthMin = "",
  lengthMax = "",
  onLengthMinChange,
  onLengthMaxChange,
}) {
  if (!showDate && !showLength && !showProgress && !showHertz) return null;

  return (
    <div className="hd__range-filters">
      {showDate && (
        <RangeRow label="Date">
          <DatePickerInput
            ariaLabel="From date"
            title="Include entries on or after this date"
            placeholder="From"
            value={dateFrom}
            onChange={onDateFromChange}
          />
          <span className="hd__range-sep" aria-hidden="true">
            –
          </span>
          <DatePickerInput
            ariaLabel="To date"
            title="Include entries on or before this date"
            placeholder="To"
            value={dateTo}
            onChange={onDateToChange}
          />
        </RangeRow>
      )}
      {showLength && (
        <RangeRow label="Length">
          <RangeInput
            type="text"
            inputMode="text"
            placeholder="≥ s, or m:ss"
            ariaLabel="Minimum length in seconds or m:ss"
            title="Seconds (90) or m:ss (1:30)"
            value={lengthMin}
            onChange={onLengthMinChange}
            invalid={lengthMin.trim() !== "" && parseLengthBound(lengthMin) == null}
          />
          <span className="hd__range-sep" aria-hidden="true">
            –
          </span>
          <RangeInput
            type="text"
            inputMode="text"
            placeholder="≤ s, or m:ss"
            ariaLabel="Maximum length in seconds or m:ss"
            title="Seconds (90) or m:ss (1:30)"
            value={lengthMax}
            onChange={onLengthMaxChange}
            invalid={lengthMax.trim() !== "" && parseLengthBound(lengthMax) == null}
          />
        </RangeRow>
      )}
      {showProgress && (
        <RangeRow label="Progress %">
          <RangeInput
            inputMode="decimal"
            min={0}
            max={100}
            step="any"
            placeholder="Start ≥"
            ariaLabel="Minimum progress start percent"
            value={progressFrom}
            onChange={onProgressFromChange}
          />
          <span className="hd__range-sep" aria-hidden="true">
            –
          </span>
          <RangeInput
            inputMode="decimal"
            min={0}
            max={100}
            step="any"
            placeholder="End ≤"
            ariaLabel="Maximum progress end percent"
            value={progressTo}
            onChange={onProgressToChange}
          />
        </RangeRow>
      )}
      {showHertz && (
        <RangeRow label="Hertz">
          <RangeInput
            inputMode="numeric"
            min={0}
            placeholder="Hz ≥"
            ariaLabel="Minimum hertz"
            value={hzMin}
            onChange={onHzMinChange}
          />
          <span className="hd__range-sep" aria-hidden="true">
            –
          </span>
          <RangeInput
            inputMode="numeric"
            min={0}
            placeholder="Hz ≤"
            ariaLabel="Maximum hertz"
            value={hzMax}
            onChange={onHzMaxChange}
          />
        </RangeRow>
      )}
    </div>
  );
}
