/**
 * Sitemap generation: fetch everything, THEN write everything (Phase 16F.4).
 *
 * The original generator "degraded" a failed request to an empty list and
 * wrote the files anyway. With the API unreachable that silently replaced the
 * committed business/category/location sitemaps with empty ones — telling
 * crawlers the site had no pages — and still exited 0. Now any failed,
 * non-2xx, malformed or truncated response aborts the run BEFORE a single
 * file is written, so the committed sitemaps stay as they were and the
 * command exits non-zero.
 *
 * Network and disk are injected, so this is testable without either.
 */
import { join } from "node:path";
import {
  buildSitemaps,
  type ApiBusiness,
  type ApiCategory,
  type ApiRegion,
  type BuiltSitemaps,
  type SitemapSources,
} from "./build.ts";

/** The API rejects limit > 100 with a 400, so the business list has to be paged. */
export const PAGE_SIZE = 100;
/** Guard against a malformed meta block turning paging into an unbounded loop. */
export const MAX_PAGES = 200;
const REQUEST_TIMEOUT_MS = 30_000;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Any reason the API data is not trustworthy enough to publish. */
export class SitemapSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SitemapSourceError";
  }
}

async function fetchJsonStrict(apiUrl: string, path: string, fetchImpl: FetchLike): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiUrl}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SitemapSourceError(`${path}: request failed (${message})`);
  }
  if (!res.ok) throw new SitemapSourceError(`${path}: HTTP ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new SitemapSourceError(`${path}: response is not JSON`);
  }
}

function expectArray<T>(path: string, value: unknown): T[] {
  if (!Array.isArray(value)) throw new SitemapSourceError(`${path}: expected an array`);
  return value as T[];
}

/** Every APPROVED business, page by page; a truncated walk is an error, not a smaller sitemap. */
async function fetchAllBusinesses(apiUrl: string, fetchImpl: FetchLike): Promise<ApiBusiness[]> {
  const all: ApiBusiness[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const path = `/businesses?page=${page}&limit=${PAGE_SIZE}`;
    const body = (await fetchJsonStrict(apiUrl, path, fetchImpl)) as {
      data?: unknown;
      meta?: { totalPages?: number };
    } | null;
    const rows = expectArray<ApiBusiness>(path, body?.data);
    all.push(...rows);

    const totalPages = body?.meta?.totalPages ?? 1;
    if (rows.length === 0 || page >= totalPages) return all;
  }
  throw new SitemapSourceError(`/businesses: more than ${MAX_PAGES} pages — refusing to publish a truncated sitemap`);
}

/**
 * All the API data the sitemaps need. Categories come from GET /categories —
 * the full active tree — not GET /categories/homepage, which only holds the
 * homepage tiles and left every other category's landing page unlisted.
 */
export async function fetchSitemapSources(apiUrl: string, fetchImpl: FetchLike): Promise<SitemapSources> {
  const [regions, categories, businesses] = await Promise.all([
    fetchJsonStrict(apiUrl, "/geography/regions", fetchImpl).then((v) => expectArray<ApiRegion>("/geography/regions", v)),
    fetchJsonStrict(apiUrl, "/categories", fetchImpl).then((v) => expectArray<ApiCategory>("/categories", v)),
    fetchAllBusinesses(apiUrl, fetchImpl),
  ]);
  return { regions, categories, businesses };
}

export interface GenerateOptions {
  apiUrl: string;
  siteUrl: string;
  outDir: string;
  today: string;
  fetchImpl: FetchLike;
  writeFile: (path: string, contents: string) => Promise<void>;
}

/** Fetches every source (throwing before any write on failure), then writes all files, index last. */
export async function generateSitemaps(options: GenerateOptions): Promise<BuiltSitemaps> {
  const sources = await fetchSitemapSources(options.apiUrl, options.fetchImpl);
  const built = buildSitemaps(sources, { siteUrl: options.siteUrl, today: options.today });

  for (const file of built.files) {
    await options.writeFile(join(options.outDir, file.name), file.xml);
  }
  await options.writeFile(join(options.outDir, "sitemap.xml"), built.index);
  return built;
}
