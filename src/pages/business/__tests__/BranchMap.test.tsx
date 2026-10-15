import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Branch } from "../../../types";
import BranchMap from "../BranchMap";

// A real Leaflet map in jsdom: no layout engine, so nothing about pixels or
// tiles is asserted — only that the markers exist, are named, and that a
// different business gets a fresh map instead of the previous one's view.
type Located = Branch & { lat: number; lng: number };

function located(id: number, lat: number, lng: number): Located {
  return { id, nameUz: "Filial " + id, nameRu: "Филиал " + id, nameEn: "Branch " + id, address: "Manzil " + id, phone: null, lat, lng };
}

function tree(branches: Located[]) {
  return (
    <MemoryRouter initialEntries={["/uz/business/soy"]}>
      <Routes>
        <Route
          path="/:lang/business/:slug"
          element={
            <LanguageProvider>
              <BranchMap branches={branches} />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("BranchMap", () => {
  it("draws one named marker per branch", () => {
    const { container } = render(tree([located(1, 40.78, 72.34), located(2, 40.8, 72.5)]));

    const markers = container.querySelectorAll(".leaflet-marker-icon");
    expect(markers).toHaveLength(2);
    expect(Array.from(markers).map((m) => m.getAttribute("title"))).toEqual(["Filial 1", "Filial 2"]);
  });

  it("copes with branches at exactly the same coordinates", () => {
    const { container } = render(tree([located(1, 40.78, 72.34), located(2, 40.78, 72.34)]));

    expect(container.querySelectorAll(".leaflet-marker-icon")).toHaveLength(2);
  });

  it("starts a new map when the page is reused for another business", () => {
    const { container, rerender } = render(tree([located(1, 40.78, 72.34)]));
    const first = container.querySelector(".leaflet-container");

    rerender(tree([located(7, 40.9, 72.6)]));
    const second = container.querySelector(".leaflet-container");

    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    expect(container.querySelector(".leaflet-marker-icon")?.getAttribute("title")).toBe("Filial 7");
  });
});
