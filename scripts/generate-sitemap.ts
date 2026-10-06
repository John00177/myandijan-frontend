/**
 * Generates public/sitemap.xml (a sitemap index) plus five sub-sitemaps —
 * pages, businesses, categories, locations and events — from live API data.
 *
 * Run with:  npm run sitemap
 *
 * All-or-nothing (Phase 16F.4): if any API request fails, returns a non-2xx
 * status or malformed data, nothing is written, the committed sitemaps stay
 * as they were, and the command exits 1. Building lives in sitemap/build.ts,
 * fetching and writing in sitemap/generate.ts — both tested without network.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateSitemaps, SitemapSourceError } from "./sitemap/generate.ts";

const SITE_URL = (process.env.SITE_URL || "https://myandijan.uz").replace(/\/$/, "");
const API_URL = (process.env.VITE_API_URL || "https://myandijan-api-production.up.railway.app").replace(/\/$/, "");
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

async function main(): Promise<void> {
  console.log(`Generating sitemaps`);
  console.log(`  site: ${SITE_URL}`);
  console.log(`  api:  ${API_URL}`);

  await mkdir(OUT_DIR, { recursive: true });

  const built = await generateSitemaps({
    apiUrl: API_URL,
    siteUrl: SITE_URL,
    outDir: OUT_DIR,
    today: new Date().toISOString().slice(0, 10),
    fetchImpl: fetch,
    writeFile: (path, contents) => writeFile(path, contents, "utf8"),
  });

  for (const file of built.files) {
    console.log(`  ✓ ${file.name.padEnd(24)} ${String(file.urlCount).padStart(5)} urls`);
  }
  console.log(`  ✓ sitemap.xml             index of ${built.files.length}`);

  const total = built.files.reduce((sum, file) => sum + file.urlCount, 0);
  console.log(`Done — ${total} urls across ${built.files.length} sitemaps.`);

  if (built.files.find((file) => file.name === "sitemap-businesses.xml")?.urlCount === 0) {
    console.log("Note: /businesses returned no rows, so sitemap-businesses.xml is empty.");
  }
}

main().catch((error: unknown) => {
  if (error instanceof SitemapSourceError) {
    console.error(`Sitemap generation aborted — no files were written. ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
