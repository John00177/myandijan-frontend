import { Link } from "react-router-dom";
import NotFoundState from "../components/seo/NotFoundState";
import { useLanguage } from "../contexts/LanguageContext";

/**
 * Catch-all for any path under /:lang that no route matches (Phase 16F.1).
 * Previously such a URL rendered an empty Layout — still a 200 (the SPA
 * rewrite answers every path) with index.html's homepage title, i.e. an
 * indexable blank page. Always noindex: the URL is known not to exist.
 */
export default function NotFoundPage() {
  const { lang, t } = useLanguage();
  return (
    <div className="max-w-7xl mx-auto px-6 py-20">
      <NotFoundState title={t("pageNotFound")} body={t("pageNotFoundBody")} noIndex>
        <Link
          to={`/${lang}`}
          className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-btn bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {t("notFound.backHome")}
        </Link>
      </NotFoundState>
    </div>
  );
}
