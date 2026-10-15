import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { dictionaries } from "../../i18n";
import HeroSection from "../home/HeroSection";

/**
 * The hero once showed four hard-coded "weather" cards (fixed temperatures,
 * conditions and "tomorrow" forecasts) that no source backed. These tests keep
 * invented weather from coming back: no source has been chosen, so nothing
 * weather-like may render until one is wired to a verified provider.
 */
function renderHero(lang: "uz" | "ru" | "en") {
  return render(
    <MemoryRouter initialEntries={[`/${lang}`]}>
      <Routes>
        <Route
          path="/:lang"
          element={
            <LanguageProvider>
              <HeroSection />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HeroSection — no invented weather", () => {
  it.each(["uz", "ru", "en"] as const)("renders no temperature, condition or forecast in %s", (lang) => {
    const { container } = renderHero(lang);

    // The search form and category chips are the hero's real content and must survive.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(dictionaries[lang]["search.placeholder"])).toBeInTheDocument();
    expect(screen.getByText(dictionaries[lang]["hero.chip.restaurants"])).toBeInTheDocument();

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/°/);
    for (const word of ["Quyoshli", "Bulutli", "Ertaga", "Солнечно", "Облачно", "Завтра", "Sunny", "Cloudy", "Rainy", "Tomorrow"]) {
      expect(text).not.toContain(word);
    }
  });

  it("keeps no weather-condition strings in any dictionary", () => {
    for (const dict of Object.values(dictionaries)) {
      expect(Object.keys(dict).filter((k) => k.startsWith("hero.weather."))).toEqual([]);
    }
  });
});
