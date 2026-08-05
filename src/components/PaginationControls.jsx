import { useEffect, useState } from "react";
import { getPaginationItems } from "../utils/leaderboard";

function EllipsisJump({
  classPrefix,
  ellipsisLabel,
  defaultPage,
  totalPages,
  onPageChange,
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(defaultPage));

  useEffect(() => {
    setValue(String(defaultPage));
  }, [defaultPage]);

  const commit = () => {
    const nextPage = Number(value);
    if (!Number.isFinite(nextPage)) {
      setEditing(false);
      return;
    }
    onPageChange(Math.min(Math.max(1, nextPage), totalPages), "jump");
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className={`${classPrefix}__page-input ${classPrefix}__page-input--ellipsis`}
        type="number"
        min={1}
        max={totalPages}
        value={value}
        autoFocus
        aria-label="Jump to page"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`${classPrefix}__page-ellipsis`}
      aria-label={`Jump near page ${defaultPage}`}
      onClick={() => {
        setValue(String(defaultPage));
        setEditing(true);
      }}
    >
      {ellipsisLabel}
    </button>
  );
}

export default function PaginationControls({
  classPrefix,
  ellipsisLabel,
  page,
  totalPages,
  onPageChange,
}) {
  const items = getPaginationItems(page, totalPages);

  if (totalPages <= 1) return null;

  return (
    <div className={`${classPrefix}__pagination`}>
      <button
        type="button"
        className={`${classPrefix}__page-btn`}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1, "prev")}
      >
        Previous
      </button>

      <div className={`${classPrefix}__page-numbers`}>
        {items.map((item, index) => {
          if (item.type === "ellipsis") {
            return (
              <EllipsisJump
                key={`${item.side}-${index}`}
                classPrefix={classPrefix}
                ellipsisLabel={ellipsisLabel}
                defaultPage={item.defaultPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            );
          }

          return (
            <button
              key={item.value}
              type="button"
              className={`${classPrefix}__page-num${item.value === page ? " is-active" : ""}`}
              onClick={() => onPageChange(item.value, "jump")}
            >
              {item.value}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className={`${classPrefix}__page-btn`}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1, "next")}
      >
        Next
      </button>
    </div>
  );
}
