import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "../../contexts/LanguageContext";
import { dictionaries } from "../../i18n";
import UsefulServices from "../home/UsefulServices";

/**
 * The "Weather" tile showed no data: it was a title and "Andijan weather
 * forecast" over a link to the generic search page, with no weather source
 * behind it. It was removed with the invented hero weather cards. These tests
 * keep it (and any weather claim) off the homepage until a verified provider
 * is approved; the remaining tiles must be untouched.
 */
const OTHER_TILES = ["jobs", "classifieds", "transport", "queue", "complaint", "gov", "banks"] as const;
const LANGS = ["uz", "ru", "en"] as const;

function renderServices(lang: (typeof LANGS)[number]) {
  return render(
    <MemoryRouter initialEntries={[`/${lang}`]}>
      <Routes>
        <Route
          path="/:lang"
          element={
            <LanguageProvider>
              <UsefulServices />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UsefulServices — no weather tile", () => {
  it.each(LANGS)("renders the seven other tiles and no weather tile or claim in %s", (lang) => {
    const d = dictionaries[lang];
    const { container } = renderServices(lang);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(d["services.title"]);
    for (const tile of OTHER_TILES) {
      expect(screen.getByText(d[`services.${tile}.title`])).toBeInTheDocument();
      expect(screen.getByText(d[`services.${tile}.desc`])).toBeInTheDocument();
    }

    const text = container.textContent ?? "";
    for (const word of ["Weather", "weather", "Ob-havo", "ob-havo", "Погода", "погода", "Погоду", "forecast"]) {
      expect(text).not.toContain(word);
    }
    // Exactly the seven tiles remain (one icon box each), so nothing replaced the weather tile either.
    expect(container.querySelectorAll(".size-12")).toHaveLength(OTHER_TILES.length);
  });

  it("keeps no weather strings in any dictionary", () => {
    for (const dict of Object.values(dictionaries)) {
      expect(Object.keys(dict).filter((k) => /weather/i.test(k))).toEqual([]);
    }
  });
});
