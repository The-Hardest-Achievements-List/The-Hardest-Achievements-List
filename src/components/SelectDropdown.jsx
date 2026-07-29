import { useState, useRef, useEffect } from "react";

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path
      d="M2 3.5L5 6.5L8 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Pass className prefixes via `variant`: "hd" | "hd-drawer" | "hd-compact" | "lb".
 */
export default function SelectDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  variant = "hd",
  className = "",
  leading = null,
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected =
    options.find((option) => option.value === value) ?? options[0];
  const label = selected?.label ?? value;

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isLb = variant === "lb";
  const rootClass = isLb
    ? `lb__dropdown${className ? ` ${className}` : ""}`
    : `hd__sel${variant === "hd-drawer" ? " hd__sel--drawer" : ""}${variant === "hd-compact" ? " hd__sel--compact" : ""}${className ? ` ${className}` : ""}`;
  const btnClass = isLb
    ? `lb__dropdown-btn${buttonClassName ? ` ${buttonClassName}` : ""}`
    : `hd__sel-btn${buttonClassName ? ` ${buttonClassName}` : ""}`;
  const menuClass = isLb ? "lb__dropdown-menu" : "hd__sel-menu";
  const itemClass = (optionValue) =>
    isLb
      ? `lb__dropdown-item${value === optionValue ? " is-active" : ""}`
      : `hd__sel-item${value === optionValue ? " is-active" : ""}`;

  return (
    <div className={rootClass} ref={ref}>
      <button
        type="button"
        className={btnClass}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup={isLb ? "listbox" : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        {leading}
        {isLb || variant === "hd-compact" ? (
          <span className={isLb ? "lb__dropdown-label" : "hd__sel-btn-label"}>
            {label}
          </span>
        ) : (
          label
        )}
        <Chevron />
      </button>

      {open && (
        <div
          className={menuClass}
          role={isLb ? "listbox" : undefined}
          aria-label={isLb ? ariaLabel : undefined}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role={isLb ? "option" : undefined}
              aria-selected={isLb ? value === option.value : undefined}
              className={itemClass(option.value)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.leading ? (
                <span className="lb__dropdown-item-leading">{option.leading}</span>
              ) : null}
              {isLb ? <span>{option.label}</span> : option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
