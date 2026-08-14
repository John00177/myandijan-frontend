import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { dictionaries, type TranslationKey } from "../i18n";
import type { Lang } from "../types";

const SUPPORTED_LANGS: Lang[] = ["uz", "ru", "en"];
const STORAGE_KEY = "myandijan_lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(value: string | undefined): value is Lang {
  return !!value && SUPPORTED_LANGS.includes(value as Lang);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { lang: langParam } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const lang: Lang = isLang(langParam)
    ? langParam
    : (localStorage.getItem(STORAGE_KEY) as Lang | null) ?? "uz";

  const setLang = useCallback(
    (next: Lang) => {
      localStorage.setItem(STORAGE_KEY, next);
      const rest = location.pathname.split("/").slice(2).join("/");
      navigate(`/${next}${rest ? `/${rest}` : ""}${location.search}`);
    },
    [location.pathname, location.search, navigate],
  );

  const t = useCallback((key: TranslationKey) => dictionaries[lang][key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

export { SUPPORTED_LANGS, isLang };
