import { Outlet } from "react-router-dom";
import AuthModal from "./auth/AuthModal";
import { LanguageProvider } from "../contexts/LanguageContext";

/**
 * Shared shell for everything under /:lang. Both the marketing site (which
 * wraps its children in the full Layout — header, footer, bottom nav) and the
 * owner dashboard (which has no use for any of that chrome) sit as sibling
 * routes below this, so AuthModal is mounted once here rather than duplicated
 * in both layouts.
 */
export default function LangShell() {
  return (
    <LanguageProvider>
      <Outlet />
      <AuthModal />
    </LanguageProvider>
  );
}
