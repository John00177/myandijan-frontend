import { describe, expect, it } from "vitest";
import { localBusinessSchemaType, localizedMetaOverride, metaDescription, sameAsLinks } from "../seo";

describe("localBusinessSchemaType", () => {
  it("maps known top-level categories to a schema.org subtype", () => {
    expect(localBusinessSchemaType("oziq-ovqat")).toBe("FoodEstablishment");
    expect(localBusinessSchemaType("sogliq")).toBe("MedicalBusiness");
  });

  it("falls back to LocalBusiness for an unknown or missing category", () => {
    expect(localBusinessSchemaType("xizmatlar")).toBe("LocalBusiness");
    expect(localBusinessSchemaType(null)).toBe("LocalBusiness");
  });
});

describe("localizedMetaOverride", () => {
  it("prefers the page language, then Uzbek, ignoring blanks", () => {
    expect(localizedMetaOverride({ metaTitleRu: "RU", metaTitleUz: "UZ" }, "metaTitle", "ru")).toBe("RU");
    expect(localizedMetaOverride({ metaTitleUz: "UZ" }, "metaTitle", "en")).toBe("UZ");
    expect(localizedMetaOverride({ metaDescriptionEn: "  " }, "metaDescription", "en")).toBeNull();
  });
});

describe("metaDescription", () => {
  it("keeps short text and collapses whitespace", () => {
    expect(metaDescription("  Bir   ikki\nuch ")).toBe("Bir ikki uch");
  });

  it("cuts long text at a word boundary within the limit", () => {
    const out = metaDescription("soz ".repeat(60), 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("soz…")).toBe(true);
  });
});

describe("sameAsLinks", () => {
  it("keeps only absolute http(s) links", () => {
    expect(sameAsLinks("https://shop.uz", "@shop", null, "t.me/shop", " http://x.uz ")).toEqual([
      "https://shop.uz",
      "http://x.uz",
    ]);
  });
});
