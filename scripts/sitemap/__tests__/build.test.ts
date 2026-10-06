import { describe, expect, it } from "vitest";
import { buildSitemaps, renderUrlset, type SitemapSources } from "../build.ts";

const SITE = "https://myandijan.uz";
const TODAY = "2026-10-06";

function sources(overrides: Partial<SitemapSources> = {}): SitemapSources {
  return { regions: [], categories: [], businesses: [], events: [], ...overrides };
}

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe("renderUrlset", () => {
  it("emits each page once per language with every hreflang alternate and x-default", () => {
    const xml = renderUrlset(SITE, [{ path: "business/soy", lastmod: "2026-09-20T10:00:00.000Z" }]);

    expect(xml).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...["uz", "ru", "en"].flatMap((lang) => [
          "  <url>",
          `    <loc>${SITE}/${lang}/business/soy</loc>`,
          "    <lastmod>2026-09-20</lastmod>",
          `    <xhtml:link rel="alternate" hreflang="uz" href="${SITE}/uz/business/soy" />`,
          `    <xhtml:link rel="alternate" hreflang="ru" href="${SITE}/ru/business/soy" />`,
          `    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/business/soy" />`,
          `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/uz/business/soy" />`,
          "  </url>",
        ]),
        "</urlset>",
        "",
      ].join("\n"),
    );
  });

  it("omits lastmod when the date is missing or invalid", () => {
    const xml = renderUrlset(SITE, [
      { path: "a", lastmod: null },
      { path: "b", lastmod: "not a date" },
    ]);
    expect(xml).not.toContain("<lastmod>");
  });

  it("escapes XML special characters", () => {
    expect(renderUrlset(SITE, [{ path: "business/a&b" }])).toContain(`${SITE}/uz/business/a&amp;b`);
  });
});

describe("buildSitemaps", () => {
  it("builds the five sub-sitemaps and an index listing all of them, empty ones included", () => {
    const built = buildSitemaps(sources(), { siteUrl: SITE, today: TODAY });

    expect(built.files.map((f) => f.name)).toEqual([
      "sitemap-pages.xml",
      "sitemap-businesses.xml",
      "sitemap-categories.xml",
      "sitemap-locations.xml",
      "sitemap-events.xml",
    ]);
    expect(locs(built.index)).toEqual(built.files.map((f) => `${SITE}/${f.name}`));
    expect(built.index).toContain(`<lastmod>${TODAY}</lastmod>`);
    expect(built.files[1].urlCount).toBe(0);
  });

  it("lists the home, search and events pages in every language", () => {
    const pages = buildSitemaps(sources(), { siteUrl: SITE, today: TODAY }).files[0];
    expect(locs(pages.xml)).toEqual([
      `${SITE}/uz`, `${SITE}/ru`, `${SITE}/en`,
      `${SITE}/uz/search`, `${SITE}/ru/search`, `${SITE}/en/search`,
      `${SITE}/uz/events`, `${SITE}/ru/events`, `${SITE}/en/events`,
    ]);
  });

  it("lists every business once, by slug, with its updatedAt as lastmod", () => {
    const built = buildSitemaps(
      sources({
        businesses: [
          { slug: "soy", updatedAt: "2026-09-01T00:00:00Z" },
          { slug: "soy", updatedAt: "2026-09-02T00:00:00Z" },
          { slug: "kok-choy" },
        ],
      }),
      { siteUrl: SITE, today: TODAY },
    );
    const file = built.files[1];
    expect(file.urlCount).toBe(6);
    expect(locs(file.xml).filter((l) => l.includes("/uz/"))).toEqual([`${SITE}/uz/business/soy`, `${SITE}/uz/business/kok-choy`]);
    expect(file.xml).toContain("<lastmod>2026-09-01</lastmod>");
  });

  it("lists every active category in the tree, nested ones included, and skips inactive subtrees", () => {
    const built = buildSitemaps(
      sources({
        categories: [
          { slug: "oziq-ovqat", children: [{ slug: "kafe" }, { slug: "yopilgan", isActive: false, children: [{ slug: "ichki" }] }] },
          { slug: "xizmatlar" },
          { slug: "kafe" },
        ],
      }),
      { siteUrl: SITE, today: TODAY },
    );
    expect(locs(built.files[2].xml).filter((l) => l.includes("/uz/"))).toEqual([
      `${SITE}/uz/category/oziq-ovqat`,
      `${SITE}/uz/category/kafe`,
      `${SITE}/uz/category/xizmatlar`,
    ]);
  });

  it("lists active districts once across regions and never emits city URLs (no city route exists)", () => {
    const built = buildSitemaps(
      sources({
        regions: [
          { slug: "andijon-viloyati", districts: [{ slug: "asaka", cities: [{ slug: "asaka-shahri" }] }, { slug: "eski", isActive: false }] },
          { slug: "other", districts: [{ slug: "asaka" }] },
        ],
      }),
      { siteUrl: SITE, today: TODAY },
    );
    const urls = locs(built.files[3].xml);
    expect(urls.filter((l) => l.includes("/uz/"))).toEqual([`${SITE}/uz/district/asaka`]);
    expect(urls.join(" ")).not.toContain("city");
  });

  // Phase 16F.5: event detail pages (/:lang/events/:slug).
  it("lists every event detail page once per language, with alternates and no fake lastmod", () => {
    const built = buildSitemaps(
      sources({ events: [{ slug: "navroz-bayrami" }, { slug: "navroz-bayrami" }, { slug: "kitob-kuni" }] }),
      { siteUrl: SITE, today: TODAY },
    );
    const file = built.files[4];

    expect(file.name).toBe("sitemap-events.xml");
    expect(file.urlCount).toBe(6);
    expect(locs(file.xml)).toEqual([
      `${SITE}/uz/events/navroz-bayrami`, `${SITE}/ru/events/navroz-bayrami`, `${SITE}/en/events/navroz-bayrami`,
      `${SITE}/uz/events/kitob-kuni`, `${SITE}/ru/events/kitob-kuni`, `${SITE}/en/events/kitob-kuni`,
    ]);
    expect(file.xml).toContain(`hreflang="x-default" href="${SITE}/uz/events/kitob-kuni"`);
    expect(file.xml).not.toContain("<lastmod>");
  });

  it("does not change the other sitemaps when events are added", () => {
    const base = sources({ businesses: [{ slug: "soy" }], regions: [{ slug: "r", districts: [{ slug: "asaka" }] }] });
    const without = buildSitemaps(base, { siteUrl: SITE, today: TODAY });
    const withEvents = buildSitemaps({ ...base, events: [{ slug: "navroz-bayrami" }] }, { siteUrl: SITE, today: TODAY });

    expect(withEvents.files.slice(0, 4)).toEqual(without.files.slice(0, 4));
  });
});
