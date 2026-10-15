import { configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { dictionaries } from "../../i18n";
import SearchPage from "../SearchPage";

// The first render in this file is cold (~1s) and the whole suite runs in parallel,
// so Testing Library's default 1s wait can expire on a loaded machine.
configure({ asyncUtilTimeout: 5000 });

vi.mock("../../lib/api", () => import("../../test/apiMock"));
// Leaflet needs real layout measurement that jsdom doesn't provide.
vi.mock("../search/SearchMap", () => ({ default: () => null }));

type Lang = "uz" | "ru" | "en";
const LANGS: Lang[] = ["uz", "ru", "en"];

/** Lets a test move between languages inside one router, to prove nothing goes stale. */
function GoTo({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  );
}

function renderAt(path: string, goTo?: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/search"
              element={
                <LanguageProvider>
                  <SearchPage />
                  {goTo && <GoTo to={goTo} />}
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

/** Exactly one h1, with this text — never a raw key or another language's string. */
async function expectSingleH1(text: string) {
  await waitFor(() => expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(text);
}

describe("SearchPage — localized title and h1", () => {
  it.each(LANGS)("generic search in %s: localized title, description and one h1", async (lang) => {
    const d = dictionaries[lang];
    renderAt(`/${lang}/search`);

    await expectSingleH1(d["search.h1"]);
    await waitFor(() => expect(document.title).toBe(d["search.metaTitle"]));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(description).toBe(d["search.metaDescription"]);
    expect(document.title).not.toMatch(/search\.|metaTitle/);
  });

  it.each(LANGS)("generic search with ?q= in %s: title carries the query in the page language", async (lang) => {
    const d = dictionaries[lang];
    renderAt(`/${lang}/search?q=osh`);

    await expectSingleH1(d["search.h1"]);
    await waitFor(() => expect(document.title).toBe(d["search.metaTitleQuery"].replace("{query}", "osh")));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(description).toBe(d["search.metaDescriptionQuery"].replace("{query}", "osh"));
  });

  it.each(["a$&b", "x$1y", "p$`q", "$$"])("puts the typed query %s into the title and description literally", async (typed) => {
    const d = dictionaries.en;
    renderAt(`/en/search?q=${encodeURIComponent(typed)}`);

    // String.replace would read `$&`, `$1`, a backtick pattern and `$$` in the query as substitution patterns.
    await waitFor(() => expect(document.title).toBe(d["search.metaTitleQuery"].replace("{query}", () => typed)));
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(description).toBe(d["search.metaDescriptionQuery"].replace("{query}", () => typed));
    expect(document.title).toContain(typed);
  });

  it.each(LANGS)("restaurant search (?category=oziq-ovqat) in %s: localized title and one h1", async (lang) => {
    const d = dictionaries[lang];
    renderAt(`/${lang}/search?category=oziq-ovqat`);

    await expectSingleH1(d["restaurants.h1"]);
    await waitFor(() => expect(document.title).toBe(d["restaurants.metaTitle"]));
  });

  it("does not keep the previous language's title or h1 after switching language", async () => {
    renderAt("/uz/search", "/en/search");
    await waitFor(() => expect(document.title).toBe(dictionaries.uz["search.metaTitle"]));

    fireEvent.click(screen.getByRole("button", { name: "go" }));

    await waitFor(() => expect(document.title).toBe(dictionaries.en["search.metaTitle"]));
    await expectSingleH1(dictionaries.en["search.h1"]);
  });

  it("has a distinct, non-Uzbek translation for every new string in ru and en", () => {
    const keys = [
      "search.h1",
      "search.metaTitle",
      "search.metaTitleQuery",
      "search.metaDescription",
      "search.metaDescriptionQuery",
      "restaurants.h1",
      "restaurants.metaTitle",
      "restaurants.metaDescription",
    ] as const;
    for (const key of keys) {
      expect(dictionaries.ru[key]).not.toBe(dictionaries.uz[key]);
      expect(dictionaries.en[key]).not.toBe(dictionaries.uz[key]);
      expect(dictionaries.en[key]).not.toBe(dictionaries.ru[key]);
    }
  });
});
