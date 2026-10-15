import { describe, expect, it } from "vitest";
import type { Branch } from "../../types";
import { branchDirectionsUrl, hasCoordinates } from "../maps";

function branch(overrides: Partial<Branch> = {}): Branch {
  return { id: 1, nameUz: "Asosiy", nameRu: "Основной", nameEn: "Main", address: null, phone: null, ...overrides };
}

describe("hasCoordinates", () => {
  it("accepts a normal Andijan coordinate", () => {
    expect(hasCoordinates(branch({ lat: 40.7823, lng: 72.3442 }))).toBe(true);
  });

  it.each([
    ["missing", {}],
    ["null", { lat: null, lng: null }],
    ["only one half", { lat: 40.78, lng: null }],
    ["NaN", { lat: Number.NaN, lng: 72.34 }],
    ["Infinity", { lat: 40.78, lng: Number.POSITIVE_INFINITY }],
    ["latitude out of range", { lat: 91, lng: 72.34 }],
    ["longitude out of range", { lat: 40.78, lng: 181 }],
    ["null island (0, 0)", { lat: 0, lng: 0 }],
  ])("rejects %s", (_label, overrides) => {
    expect(hasCoordinates(branch(overrides as Partial<Branch>))).toBe(false);
  });
});

describe("branchDirectionsUrl", () => {
  it("uses the coordinates when the branch has them", () => {
    expect(branchDirectionsUrl(branch({ lat: 40.7823, lng: 72.3442, address: "Bobur shoh 1" }))).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=40.782300,72.344200",
    );
  });

  it("falls back to the URL-encoded address", () => {
    expect(branchDirectionsUrl(branch({ address: "Bobur shoh 1 & <b>Navoiy</b>" }))).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Bobur%20shoh%201%20%26%20%3Cb%3ENavoiy%3C%2Fb%3E",
    );
  });

  it("does not fall back to a (0, 0) point: an unusable coordinate uses the address", () => {
    expect(branchDirectionsUrl(branch({ lat: 0, lng: 0, address: "Navoiy 5" }))).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Navoiy%205",
    );
  });

  it("returns null with neither coordinates nor a usable address", () => {
    expect(branchDirectionsUrl(branch())).toBeNull();
    expect(branchDirectionsUrl(branch({ address: "   " }))).toBeNull();
  });
});
