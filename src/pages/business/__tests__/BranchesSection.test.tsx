import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Branch } from "../../../types";
import BranchesSection from "../BranchesSection";

function branch(id: number, overrides: Partial<Branch> = {}): Branch {
  return { id, nameUz: "Filial " + id, nameRu: "Филиал " + id, nameEn: "Branch " + id, address: null, phone: null, ...overrides };
}

function renderSection(branches: Branch[]) {
  return render(
    <MemoryRouter initialEntries={["/uz/business/soy"]}>
      <Routes>
        <Route
          path="/:lang/business/:slug"
          element={
            <LanguageProvider>
              <BranchesSection branches={branches} />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BranchesSection directions", () => {
  it("gives every branch its own directions link: coordinates, address fallback, or none", () => {
    renderSection([
      branch(1, { address: "Bobur shoh 1", lat: 40.7823, lng: 72.3442 }),
      branch(2, { address: "Navoiy 5" }),
      branch(3),
    ]);

    const links = screen.getAllByRole("link", { name: "Yo'nalish" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=40.782300,72.344200");
    expect(links[1]).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=Navoiy%205");
  });

  it("opens in a new tab without handing the page to the destination", () => {
    renderSection([branch(1, { lat: 40.78, lng: 72.34 })]);

    const link = screen.getByRole("link", { name: "Yo'nalish" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });
});
