import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STRINGS, type Lang, type Strings } from "./strings";

export { format } from "./strings";
export type { Lang, Strings } from "./strings";

const STORAGE_KEY = "satisfactory-tool/lang/v1";

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Strings;
  // Display the right-hand-side name for an item in the active language.
  // Falls back to the English name when a Russian translation is missing
  // (and vice versa, though the dataset has 100% Russian coverage).
  name: (item: { nameRu: string | null; name: string }) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof localStorage === "undefined") return "ru";
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "ru" ? saved : "ru";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage may be disabled — language still works in-memory.
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => {
    const t = STRINGS[lang];
    return {
      lang,
      setLang: setLangState,
      t,
      name: (item) =>
        lang === "ru" ? (item.nameRu ?? item.name) : item.name,
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useI18n called outside <I18nProvider>");
  return v;
}
