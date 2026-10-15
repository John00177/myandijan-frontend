/**
 * Pure sitemap building: API rows in, XML strings out. No network, no disk —
 * so the output can be tested exactly (Phase 16F.4). The XML format is
 * unchanged from the original single-file generator.
 *
 * Every URL is emitted once per language with a full set of xhtml:link
 * alternates, which is what Google wants for a directory that serves the same
 * entity at /uz/, /ru/ and /en/. Deliberately omits <priority> and
 * <changefreq> — Google ignores both.
 */

export const LANGS = ["uz", "ru", "en"] as const;
export type Lang = (typeof LANGS)[number];

/* ---------------------------------------------------------------- API types */

/**
 * Only the fields this script reads. The API returns more; these shapes are
 * intentionally narrow so a change elsewhere in the payload can't break it.
 */
export interface ApiCity {
  slug: string;
  isActive?: boolean;
  updatedAt?: string | null;
}

export interface ApiDistrict {
  slug: string;
  isActive?: boolean;
  updatedAt?: string | null;
  cities?: ApiCity[];
}

export interface ApiRegion {
  slug: string;
  updatedAt?: string | null;
  districts?: ApiDistrict[];
}

export interface ApiCategory {
  slug: string;
  isActive?: boolean;
  updatedAt?: string | null;
  children?: ApiCategory[];
}

export interface ApiBusiness {
  slug: string;
  updatedAt?: string | null;
}

/**
 * A row of GET /events. `updatedAt` is the event's last real edit — since API
 * Phase 16F.6, RSVP counts no longer move it — and is its only lastmod source.
 * `startAt` is deliberately NOT used: it is when the event happens, not when
 * the page last changed.
 */
export interface ApiEvent {
  slug: string;
  updatedAt?: string | null;
}

export interface SitemapSources {
  regions: ApiRegion[];
  categories: ApiCategory[];
  businesses: ApiBusiness[];
  events: ApiEvent[];
}

/* -------------------------------------------------------------- XML helpers */

/** A single logical page, emitted once per language. */
export interface SitemapEntry {
  /** Path WITHOUT the language prefix, e.g. "search" or "business/foo". Empty = language root. */
  path: string;
  /** Raw API value; validated by toLastmod at render time, so it may be anything. */
  lastmod?: unknown;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlFor(siteUrl: string, lang: Lang, path: string): string {
  return `${siteUrl}/${lang}${path ? `/${path}` : ""}`;
}

/**
 * W3C date (YYYY-MM-DD) — sitemaps accept it and it avoids fake precision.
 *
 * The value comes straight from API JSON, so it is not trusted to be what the
 * type says (Phase 16F.7). Anything that is not an ISO calendar date string
 * yields null — the URL is still listed, just without <lastmod> — instead of
 * a wrong or invalid date:
 * - non-strings (a number or boolean would otherwise become 1970-01-01);
 * - strings that do not start YYYY-MM-DD (Date parses other formats, e.g.
 *   "October 5", differently per engine);
 * - unparseable or out-of-range values (an extended year would serialise as
 *   "+275760-…", not a valid sitemap date);
 * - dates after `notAfter` (the run's date): a future lastmod is wrong data,
 *   and search engines distrust a sitemap that publishes them.
 */
export function toLastmod(value: unknown, notAfter?: string): string | null {
  if (typeof value !== "string") return null;
  const prefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!prefix) return null;
  // Date rolls impossible days over ("2026-02-30" → 2 March); reject them.
  const [year, month, dayOfMonth] = prefix.slice(1).map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== dayOfMonth) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (notAfter && day > notAfter) return null;
  return day;
}

export function renderUrlset(siteUrl: string, entries: SitemapEntry[], options: { notAfter?: string } = {}): string {
  const blocks: string[] = [];

  for (const entry of entries) {
    for (const lang of LANGS) {
      const alternates = LANGS.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${escapeXml(urlFor(siteUrl, alt, entry.path))}" />`,
      );
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(urlFor(siteUrl, "uz", entry.path))}" />`,
      );

      const lastmod = toLastmod(entry.lastmod, options.notAfter);
      blocks.push(
        [
          "  <url>",
          `    <loc>${escapeXml(urlFor(siteUrl, lang, entry.path))}</loc>`,
          ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
          ...alternates,
          "  </url>",
        ].join("\n"),
      );
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...blocks,
    "</urlset>",
    "",
  ].join("\n");
}

export function renderIndex(siteUrl: string, files: string[], lastmod: string): string {
  const blocks = files.map((file) =>
    ["  <sitemap>", `    <loc>${escapeXml(`${siteUrl}/${file}`)}</loc>`, `    <lastmod>${lastmod}</lastmod>`, "  </sitemap>"].join(
      "\n",
    ),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...blocks,
    "</sitemapindex>",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------ data shaping */

/** Categories arrive as a tree; every active node is its own page. */
export function flattenCategories(nodes: ApiCategory[]): ApiCategory[] {
  const out: ApiCategory[] = [];
  for (const node of nodes) {
    if (node.isActive === false) continue;
    out.push(node);
    if (node.children?.length) out.push(...flattenCategories(node.children));
  }
  return out;
}

export function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (item.slug && !seen.has(item.slug)) seen.set(item.slug, item);
  }
  return [...seen.values()];
}

export interface BuiltSitemapFile {
  name: string;
  xml: string;
  /** Logical entries × languages. */
  urlCount: number;
}

export interface BuiltSitemaps {
  files: BuiltSitemapFile[];
  index: string;
}

/** Every sitemap file, plus the index, from already-fetched API data. */
export function buildSitemaps(sources: SitemapSources, options: { siteUrl: string; today: string }): BuiltSitemaps {
  const { siteUrl, today } = options;

  const districts = dedupeBySlug(
    sources.regions.flatMap((region) => region.districts ?? []).filter((district) => district.isActive !== false),
  );
  const categoryList = dedupeBySlug(flattenCategories(sources.categories));
  const businessList = dedupeBySlug(sources.businesses);

  const pages: SitemapEntry[] = [
    { path: "", lastmod: today },
    { path: "search", lastmod: today },
    { path: "events", lastmod: today },
  ];

  const businessEntries: SitemapEntry[] = businessList.map((business) => ({
    path: `business/${business.slug}`,
    lastmod: business.updatedAt,
  }));

  const categoryEntries: SitemapEntry[] = categoryList.map((category) => ({
    path: `category/${category.slug}`,
    lastmod: category.updatedAt,
  }));

  // No /:lang/city/:slug route exists in the app (only category and district
  // landing pages were built — see ARCHITECTURE.md's Phase 7 section), so city
  // URLs are deliberately left out here: submitting a URL with no matching
  // route would point crawlers at a not-found page rather than real content.
  const locationEntries: SitemapEntry[] = districts.map((district) => ({
    path: `district/${district.slug}`,
    lastmod: district.updatedAt,
  }));

  // Phase 16F.5: /:lang/events/:slug detail pages. GET /events lists exactly
  // what GET /events/:slug serves (PUBLISHED, not deleted), past events
  // included — their pages still resolve, like any business page.
  const eventEntries: SitemapEntry[] = dedupeBySlug(sources.events).map((event) => ({
    path: `events/${event.slug}`,
    lastmod: event.updatedAt,
  }));

  const groups: Array<{ name: string; entries: SitemapEntry[] }> = [
    { name: "sitemap-pages.xml", entries: pages },
    { name: "sitemap-businesses.xml", entries: businessEntries },
    { name: "sitemap-categories.xml", entries: categoryEntries },
    { name: "sitemap-locations.xml", entries: locationEntries },
    { name: "sitemap-events.xml", entries: eventEntries },
  ];

  const files = groups.map((group) => ({
    name: group.name,
    // No lastmod later than the run's own date (see toLastmod).
    xml: renderUrlset(siteUrl, group.entries, { notAfter: today }),
    urlCount: group.entries.length * LANGS.length,
  }));

  // An empty sub-sitemap is still listed: it is valid, and once the API has
  // rows of that kind the file fills in without the index needing to change.
  return { files, index: renderIndex(siteUrl, files.map((file) => file.name), today) };
}
