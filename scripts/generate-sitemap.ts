/**
 * Generates public/sitemap.xml (a sitemap index) plus four sub-sitemaps from
 * live API data.
 *
 * Run with:  npm run sitemap
 *
 * Every URL is emitted once per language with a full set of xhtml:link
 * alternates, which is what Google wants for a directory that serves the same
 * entity at /uz/, /ru/ and /en/.
 *
 * Deliberately omits <priority> and <changefreq> — Google ignores both.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = (process.env.SITE_URL || "https://myandijan.uz").replace(/\/$/, "");
const API_URL = (process.env.VITE_API_URL || "https://myandijan-api-production.up.railway.app").replace(/\/$/, "");

const LANGS = ["uz", "ru", "en"] as const;
type Lang = (typeof LANGS)[number];

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const REQUEST_TIMEOUT_MS = 30_000;

/** The API rejects limit > 100 with a 400, so the business list has to be paged. */
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

/* ---------------------------------------------------------------- API types */

/**
 * Only the fields this script reads. The API returns more; these shapes are
 * intentionally narrow so a change elsewhere in the payload can't break it.
 */
interface ApiCity {
  slug: string;
  isActive?: boolean;
  updatedAt?: string | null;
}

interface ApiDistrict {
  slug: string;
  isActive?: boolean;
  updatedAt?: string | null;
  cities?: ApiCity[];
}

interface ApiRegion {
  slug: string;
  updatedAt?: string | null;
  districts?: ApiDistrict[];
}

interface ApiCategory {
  slug: string;
  isActive?: boolean;
  updatedAt?: string | null;
  children?: ApiCategory[];
}

interface ApiBusiness {
  slug: string;
  updatedAt?: string | null;
}

interface Paginated<T> {
  data: T[];
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

/* -------------------------------------------------------------- XML helpers */

/** A single logical page, emitted once per language. */
interface SitemapEntry {
  /** Path WITHOUT the language prefix, e.g. "search" or "business/foo". Empty = language root. */
  path: string;
  lastmod?: string | null;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlFor(lang: Lang, path: string): string {
  return `${SITE_URL}/${lang}${path ? `/${path}` : ""}`;
}

/** W3C date (YYYY-MM-DD) — sitemaps accept it and it avoids fake precision. */
function toLastmod(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function renderUrlset(entries: SitemapEntry[]): string {
  const blocks: string[] = [];

  for (const entry of entries) {
    for (const lang of LANGS) {
      const alternates = LANGS.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${escapeXml(urlFor(alt, entry.path))}" />`,
      );
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(urlFor("uz", entry.path))}" />`,
      );

      const lastmod = toLastmod(entry.lastmod);
      blocks.push(
        [
          "  <url>",
          `    <loc>${escapeXml(urlFor(lang, entry.path))}</loc>`,
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

function renderIndex(files: string[], lastmod: string): string {
  const blocks = files.map((file) =>
    ["  <sitemap>", `    <loc>${escapeXml(`${SITE_URL}/${file}`)}</loc>`, `    <lastmod>${lastmod}</lastmod>`, "  </sitemap>"].join(
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

/* --------------------------------------------------------------- API access */

/**
 * The sitemap is regenerated on demand, not during a user request, so a failing
 * endpoint should degrade to "no URLs of that kind" rather than abort the run
 * and leave the previous files half-updated.
 */
async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  const url = `${API_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`  ! ${path} → HTTP ${res.status}, using empty result`);
      return fallback;
    }
    return (await res.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  ! ${path} → ${message}, using empty result`);
    return fallback;
  }
}

/**
 * Walks /businesses one page at a time until the reported totalPages is
 * exhausted. MAX_PAGES is a guard against a malformed meta block spinning
 * this into an unbounded loop.
 */
async function fetchAllBusinesses(): Promise<ApiBusiness[]> {
  const all: ApiBusiness[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await fetchJson<Paginated<ApiBusiness>>(`/businesses?page=${page}&limit=${PAGE_SIZE}`, { data: [] });
    const rows = result.data ?? [];
    all.push(...rows);

    const totalPages = result.meta?.totalPages ?? 1;
    if (rows.length === 0 || page >= totalPages) break;
  }

  return all;
}

/** Categories arrive as a tree; every node is its own page. */
function flattenCategories(nodes: ApiCategory[]): ApiCategory[] {
  const out: ApiCategory[] = [];
  for (const node of nodes) {
    if (node.isActive === false) continue;
    out.push(node);
    if (node.children?.length) out.push(...flattenCategories(node.children));
  }
  return out;
}

function dedupeBySlug<T extends { slug: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (item.slug && !seen.has(item.slug)) seen.set(item.slug, item);
  }
  return [...seen.values()];
}

/* --------------------------------------------------------------------- main */

async function main(): Promise<void> {
  console.log(`Generating sitemaps`);
  console.log(`  site: ${SITE_URL}`);
  console.log(`  api:  ${API_URL}`);

  const [regions, categories, businesses] = await Promise.all([
    fetchJson<ApiRegion[]>("/geography/regions", []),
    fetchJson<ApiCategory[]>("/categories/homepage", []),
    fetchAllBusinesses(),
  ]);

  const districts = dedupeBySlug(
    regions.flatMap((region) => region.districts ?? []).filter((district) => district.isActive !== false),
  );
  const cities = dedupeBySlug(
    districts.flatMap((district) => district.cities ?? []).filter((city) => city.isActive !== false),
  );
  const categoryList = dedupeBySlug(flattenCategories(categories));
  const businessList = dedupeBySlug(businesses);

  const today = new Date().toISOString().slice(0, 10);

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

  const locationEntries: SitemapEntry[] = [
    ...districts.map((district) => ({ path: `district/${district.slug}`, lastmod: district.updatedAt })),
    ...cities.map((city) => ({ path: `city/${city.slug}`, lastmod: city.updatedAt })),
  ];

  const files: Array<{ name: string; entries: SitemapEntry[] }> = [
    { name: "sitemap-pages.xml", entries: pages },
    { name: "sitemap-businesses.xml", entries: businessEntries },
    { name: "sitemap-categories.xml", entries: categoryEntries },
    { name: "sitemap-locations.xml", entries: locationEntries },
  ];

  await mkdir(OUT_DIR, { recursive: true });

  for (const file of files) {
    await writeFile(join(OUT_DIR, file.name), renderUrlset(file.entries), "utf8");
    console.log(`  ✓ ${file.name.padEnd(24)} ${String(entriesToUrlCount(file.entries)).padStart(5)} urls`);
  }

  // An empty sub-sitemap is still listed: it is valid, and once the API has
  // businesses the file fills in without the index needing to change.
  await writeFile(join(OUT_DIR, "sitemap.xml"), renderIndex(files.map((f) => f.name), today), "utf8");
  console.log(`  ✓ sitemap.xml             index of ${files.length}`);

  const total = files.reduce((sum, file) => sum + entriesToUrlCount(file.entries), 0);
  console.log(`Done — ${total} urls across ${files.length} sitemaps.`);

  if (businessEntries.length === 0) {
    console.log("Note: /businesses returned no rows, so sitemap-businesses.xml is empty.");
  }
}

function entriesToUrlCount(entries: SitemapEntry[]): number {
  return entries.length * LANGS.length;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
