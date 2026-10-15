import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Branch } from "../../../types";
import LocationSection from "../LocationSection";

const mapState = vi.hoisted(() => ({ fail: false }));

// Leaflet needs a real layout engine; what matters here is WHICH branches the
// section hands to the map, that a business without coordinates gets none, and
// that a map which cannot load never takes the page down.
vi.mock("../BranchMap", () => ({
  default: ({ branches }: { branches: Branch[] }) => {
    if (mapState.fail) throw new Error("Failed to fetch dynamically imported module");
    return <div data-testid="branch-map">{branches.map((b) => b.id).join(",")}</div>;
  },
}));

function branch(id: number, overrides: Partial<Branch> = {}): Branch {
  return { id, nameUz: "Filial " + id, nameRu: "Филиал " + id, nameEn: "Branch " + id, address: null, phone: null, ...overrides };
}

function renderSection(branches: Branch[] | undefined, lang = "uz") {
  return render(
    <MemoryRouter initialEntries={["/" + lang + "/business/soy"]}>
      <Routes>
        <Route
          path="/:lang/business/:slug"
          element={
            <LanguageProvider>
              <LocationSection branches={branches} />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  mapState.fail = false;
  vi.restoreAllMocks();
});

describe("LocationSection", () => {
  it("shows the map under a Joylashuv heading with only the branches that have coordinates", async () => {
    renderSection([
      branch(1, { lat: 40.78, lng: 72.34 }),
      branch(2, { address: "Faqat manzil" }),
      branch(3, { lat: 0, lng: 0 }),
      branch(4, { lat: 40.8, lng: 72.4 }),
    ]);

    expect(screen.getByRole("heading", { name: "Joylashuv" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Biznes joylashuvi xaritasi" })).toBeInTheDocument();
    expect(await screen.findByTestId("branch-map")).toHaveTextContent("1,4");
  });

  it.each([
    ["ru", "Расположение", "Карта расположения бизнеса"],
    ["en", "Location", "Map of the business location"],
  ])("is translated (%s)", async (lang, heading, label) => {
    renderSection([branch(1, { lat: 40.78, lng: 72.34 })], lang);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: label })).toBeInTheDocument();
    await screen.findByTestId("branch-map");
  });

  it.each([
    ["no branches", undefined],
    ["an empty list", []],
    ["branches with no usable coordinates", [branch(1), branch(2, { lat: null, lng: 72.3 }), branch(3, { lat: 0, lng: 0 })]],
  ])("renders nothing for %s", (_label, branches) => {
    const { container } = renderSection(branches as Branch[] | undefined);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("branch-map")).not.toBeInTheDocument();
  });

  it("disappears instead of crashing the page when the map fails to load (e.g. a stale chunk after a redeploy)", async () => {
    mapState.fail = true;
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = renderSection([branch(1, { lat: 40.78, lng: 72.34 })]);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText(/Something went wrong|Xatolik/i)).not.toBeInTheDocument();
  });
});
