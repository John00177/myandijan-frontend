import type { Lang } from "../types";

/**
 * Canonical origin for every absolute URL the app emits (canonical links,
 * hreflang alternates, og:image, JSON-LD `url` fields).
 *
 * Deploy previews should set VITE_SITE_URL so they don't advertise the
 * production domain as their canonical.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://myandijan.uz").replace(/\/$/, "");

export const SITE_NAME = "My Andijan";

export const DEFAULT_OG_IMAGE = "/og-default.jpg";

/** Open Graph wants full locale codes, not the bare language segment used in URLs. */
export const OG_LOCALE: Record<Lang, string> = {
  uz: "uz_UZ",
  ru: "ru_RU",
  en: "en_US",
};

/** Resolve a possibly-relative asset path against SITE_URL. Absolute URLs pass through. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Swap the leading language segment of a pathname.
 *
 * Every route lives under /:lang, so the alternate URL for a page is the same
 * path with a different first segment — this is what the hreflang links need.
 */
export function pathForLang(pathname: string, lang: Lang): string {
  const rest = pathname.split("/").slice(2).join("/");
  return `/${lang}${rest ? `/${rest}` : ""}`;
}
