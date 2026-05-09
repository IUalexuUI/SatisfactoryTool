import { useMemo, useState, useRef, useEffect } from "react";
import { items, itemsList, displayName } from "../data";

interface Props {
  value: string | null;
  onChange: (className: string) => void;
  placeholder?: string;
  // Restrict picker to a subset (e.g. raw resources only). Defaults to all items.
  filterFn?: (className: string) => boolean;
}

export function ItemPicker({ value, onChange, placeholder, filterFn }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const baseList = useMemo(
    () => (filterFn ? itemsList.filter((i) => filterFn(i.className)) : itemsList),
    [filterFn],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseList.slice(0, 60);
    return baseList
      .filter(
        (i) =>
          (i.nameRu ?? "").toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.className.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [baseList, query]);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = value ? (items[value] ?? null) : null;
  const inputValue = open ? query : selected ? displayName(selected) : "";

  return (
    <div className="picker" ref={wrapperRef}>
      <input
        type="text"
        className="picker-input"
        value={inputValue}
        placeholder={placeholder ?? "Выбери предмет…"}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        autoComplete="off"
      />
      {open && (
        <div className="picker-dropdown">
          {filtered.length === 0 && (
            <div className="picker-empty">Ничего не найдено</div>
          )}
          {filtered.map((i) => (
            <button
              key={i.className}
              type="button"
              className="picker-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(i.className);
                setOpen(false);
                setQuery("");
              }}
            >
              <span className={`dot form-${i.form}`} />
              <span className="picker-names">
                <span className="ru">{displayName(i)}</span>
                {i.nameRu && <span className="en">{i.name}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
