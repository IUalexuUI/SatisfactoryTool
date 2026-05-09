import { useMemo, useState, useRef, useEffect } from "react";
import { items, itemsList } from "../data";
import { useI18n } from "../i18n/index.tsx";

interface Props {
  value: string | null;
  onChange: (className: string) => void;
  placeholder?: string;
  filterFn?: (className: string) => boolean;
}

export function ItemPicker({ value, onChange, placeholder, filterFn }: Props) {
  const { t, name, lang } = useI18n();
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
  const inputValue = open ? query : selected ? name(selected) : "";

  return (
    <div className="picker" ref={wrapperRef}>
      <input
        type="text"
        className="picker-input"
        value={inputValue}
        placeholder={placeholder ?? t.picker.placeholder}
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
            <div className="picker-empty">{t.picker.empty}</div>
          )}
          {filtered.map((i) => {
            const sub = lang === "ru" ? i.name : i.nameRu;
            return (
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
                  <span className="ru">{name(i)}</span>
                  {sub && sub !== name(i) && <span className="en">{sub}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
