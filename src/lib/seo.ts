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

/**
 * schema.org `LocalBusiness` subtypes the directory's top-level categories map
 * onto. A category not listed here (or a subcategory) stays plain
 * `LocalBusiness` — a wrong subtype is worse for rich results than a generic one.
 */
export type LocalBusinessSchemaType =
  | "LocalBusiness"
  | "AutomotiveBusiness"
  | "HealthAndBeautyBusiness"
  | "RealEstateAgent"
  | "FoodEstablishment"
  | "MedicalBusiness"
  | "Store";

const SCHEMA_TYPE_BY_CATEGORY: Record<string, LocalBusinessSchemaType> = {
  avto: "AutomotiveBusiness",
  gozallik: "HealthAndBeautyBusiness",
  "kochmas-mulk": "RealEstateAgent",
  "oziq-ovqat": "FoodEstablishment",
  sogliq: "MedicalBusiness",
  sotuv: "Store",
};

export function localBusinessSchemaType(categorySlug: string | null | undefined): LocalBusinessSchemaType {
  return (categorySlug && SCHEMA_TYPE_BY_CATEGORY[categorySlug]) || "LocalBusiness";
}

const LANG_SUFFIX: Record<Lang, "Uz" | "Ru" | "En"> = { uz: "Uz", ru: "Ru", en: "En" };

type MetaOverrides = Partial<
  Record<`metaTitle${"Uz" | "Ru" | "En"}` | `metaDescription${"Uz" | "Ru" | "En"}`, string | null>
>;

/** The owner's SEO override for `lang`, falling back to Uzbek; null when neither is set. */
export function localizedMetaOverride(
  source: MetaOverrides,
  field: "metaTitle" | "metaDescription",
  lang: Lang,
): string | null {
  const value = source[`${field}${LANG_SUFFIX[lang]}`] ?? source[`${field}Uz`];
  return value?.trim() || null;
}

/** Search engines show roughly 155–160 characters; cut at a word boundary. */
export function metaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const atSpace = cut.lastIndexOf(" ");
  return `${(atSpace > max / 2 ? cut.slice(0, atSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
}

/** Only absolute http(s) links are valid `sameAs` values; handles like "@shop" are skipped. */
export function sameAsLinks(...links: (string | null | undefined)[]): string[] {
  return links.filter((link): link is string => !!link && /^https?:\/\/\S+$/i.test(link.trim())).map((l) => l.trim());
}
