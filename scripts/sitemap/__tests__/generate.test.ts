import { describe, expect, it, vi } from "vitest";
import { generateSitemaps, MAX_PAGES, SitemapSourceError, type FetchLike } from "../generate.ts";

const API = "https://api.test";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** A healthy API: 2 business pages, a category tree, one region. */
function healthyRoutes(): Record<string, () => Response | Promise<Response>> {
  return {
    "/geography/regions": () => json([{ slug: "andijon", districts: [{ slug: "asaka" }, { slug: "xonobod" }] }]),
    "/categories": () => json([{ slug: "oziq-ovqat", children: [{ slug: "kafe" }] }, { slug: "xizmatlar" }]),
    "/businesses?page=1&limit=100": () => json({ data: [{ slug: "soy" }], meta: { totalPages: 2 } }),
    "/businesses?page=2&limit=100": () => json({ data: [{ slug: "kok-choy" }], meta: { totalPages: 2 } }),
  };
}

function fakeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  return vi.fn<FetchLike>(async (url) => {
    const path = url.slice(API.length);
    const route = routes[path];
    if (!route) return json({ message: `Cannot GET ${path}` }, 404);
    return route();
  });
}

function run(fetchImpl: FetchLike) {
  const writeFile = vi.fn<(path: string, contents: string) => Promise<void>>(async () => {});
  const promise = generateSitemaps({
    apiUrl: API,
    siteUrl: "https://myandijan.uz",
    outDir: "out",
    today: "2026-10-06",
    fetchImpl,
    writeFile,
  });
  return { promise, writeFile };
}

describe("generateSitemaps (Phase 16F.4)", () => {
  it("reads the FULL category tree (GET /categories), not only the homepage tiles", async () => {
    const fetchImpl = fakeFetch(healthyRoutes());
    await run(fetchImpl).promise;

    const paths = fetchImpl.mock.calls.map(([url]) => url.slice(API.length));
    expect(paths).toContain("/categories");
    expect(paths).not.toContain("/categories/homepage");
  });

  it("walks every business page and writes the four sub-sitemaps, then the index last", async () => {
    const { promise, writeFile } = run(fakeFetch(healthyRoutes()));
    const built = await promise;

    const written = writeFile.mock.calls.map(([path]) => path.replace(/\\/g, "/"));
    expect(written).toEqual([
      "out/sitemap-pages.xml",
      "out/sitemap-businesses.xml",
      "out/sitemap-categories.xml",
      "out/sitemap-locations.xml",
      "out/sitemap.xml",
    ]);
    expect(built.files.map((f) => f.urlCount)).toEqual([9, 6, 9, 6]);
    expect(writeFile.mock.calls[1][1]).toContain("https://myandijan.uz/uz/business/kok-choy");
  });

  // The regression this slice exists for: an unreachable or broken API used to
  // be "degraded" to empty lists and written over the committed sitemaps.
  it.each([
    ["the regions request fails with HTTP 503", { "/geography/regions": () => json({}, 503) }],
    ["the categories request throws (API unreachable)", { "/categories": () => Promise.reject(new TypeError("fetch failed")) }],
    ["the categories endpoint is missing (404)", { "/categories": () => json({ message: "Not Found" }, 404) }],
    ["a business page is not JSON", { "/businesses?page=1&limit=100": () => new Response("<html>", { status: 200 }) }],
    ["a business page has no data array", { "/businesses?page=1&limit=100": () => json({ items: [] }) }],
    ["the second business page fails", { "/businesses?page=2&limit=100": () => json({}, 500) }],
    ["the regions payload is not an array", { "/geography/regions": () => json({ regions: [] }) }],
  ])("aborts without writing a single file when %s", async (_case, override) => {
    const { promise, writeFile } = run(fakeFetch({ ...healthyRoutes(), ...override }));

    await expect(promise).rejects.toBeInstanceOf(SitemapSourceError);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("refuses to publish a truncated business sitemap when paging never ends", async () => {
    const fetchImpl = vi.fn<FetchLike>(async (url) => {
      const path = url.slice(API.length);
      if (path.startsWith("/businesses")) return json({ data: [{ slug: `b-${path}` }], meta: { totalPages: MAX_PAGES + 50 } });
      return healthyRoutes()[path]();
    });
    const { promise, writeFile } = run(fetchImpl);

    await expect(promise).rejects.toThrow(/more than 200 pages/);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("still writes a valid, empty business sitemap when the API genuinely has no businesses", async () => {
    const { promise, writeFile } = run(
      fakeFetch({
        ...healthyRoutes(),
        "/businesses?page=1&limit=100": () => json({ data: [], meta: { totalPages: 1 } }),
      }),
    );
    const built = await promise;

    expect(built.files[1].urlCount).toBe(0);
    expect(writeFile).toHaveBeenCalledTimes(5);
  });
});
