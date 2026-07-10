import { useEffect, useMemo, useRef, useState } from "react";

export default function CountryFilterModal({
  open,
  value,
  options,
  onChange,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const handleWheel = (event) => {
      const list = listRef.current;
      if (list?.contains(event.target)) {
        const atTop = list.scrollTop <= 0;
        const atBottom =
          list.scrollTop + list.clientHeight >= list.scrollHeight - 1;

        if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) {
          event.preventDefault();
        }
        return;
      }

      event.preventDefault();
    };

    const handleTouchMove = (event) => {
      const list = listRef.current;
      if (list?.contains(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [open, onClose]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;

    return options.filter((option) => {
      const label = String(option.label ?? "").toLowerCase();
      const code = String(option.value ?? "").toLowerCase();
      return label.includes(query) || code.includes(query);
    });
  }, [options, search]);

  if (!open) return null;

  const toggleOption = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((entry) => entry !== optionValue));
      return;
    }

    onChange([...value, optionValue]);
  };

  return (
    <div
      className="lb-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="lb-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Filter by country"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lb-modal__head">
          <h2 className="lb-modal__title">Filter by country</h2>
          <button
            type="button"
            className="lb-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <input
          className="lb-modal__search"
          type="search"
          value={search}
          placeholder="Search countries..."
          autoFocus
          onChange={(event) => setSearch(event.target.value)}
        />

        <div ref={listRef} className="lb-modal__list lb__scrollbar">
          {filteredOptions.length === 0 ? (
            <p className="lb-modal__empty">No countries found.</p>
          ) : (
            filteredOptions.map((option) => {
              const isChecked = value.includes(option.value);

              return (
                <label
                  key={option.value}
                  className={`lb-modal__item lb-modal__item--check${isChecked ? " is-active" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="lb-modal__checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(option.value)}
                  />
                  <span className="lb-modal__item-leading">
                    {option.leading}
                  </span>
                  <span className="lb-modal__item-label">{option.label}</span>
                </label>
              );
            })
          )}
        </div>

        <div className="lb-modal__footer">
          <button
            type="button"
            className="lb-modal__footer-btn"
            disabled={value.length === 0}
            onClick={() => onChange([])}
          >
            Clear all
          </button>
          <button
            type="button"
            className="lb-modal__footer-btn lb-modal__footer-btn--primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
