import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import AuthModal from "./auth/AuthModal";
import { isLang, LanguageProvider } from "../contexts/LanguageContext";

/**
 * Shared shell for everything under /:lang. Both the marketing site (which
 * wraps its children in the full Layout — header, footer, bottom nav) and the
 * owner dashboard (which has no use for any of that chrome) sit as sibling
 * routes below this, so AuthModal is mounted once here rather than duplicated
 * in both layouts.
 *
 * Phase 16F.1: `/:lang` matches ANY first segment, so `/xyz` used to render
 * the homepage and `/search` the homepage too — duplicate, indexable pages at
 * URLs that do not exist. A first segment that is not a supported language is
 * treated as a missing prefix and the path is moved under the default `uz`,
 * where it either is a real route (`/search` → `/uz/search`) or reaches the
 * noindex catch-all (`/xyz` → `/uz/xyz`). Deliberately `uz` (the x-default),
 * not the stored preference: a redirect target should not depend on
 * localStorage (see docs/SSG.md).
 */
export default function LangShell() {
  const { lang } = useParams<{ lang: string }>();
  const { pathname, search, hash } = useLocation();

  if (!isLang(lang)) {
    return <Navigate to={`/uz${pathname}${search}${hash}`} replace />;
  }

  return (
    <LanguageProvider>
      <Outlet />
      <AuthModal />
    </LanguageProvider>
  );
}
