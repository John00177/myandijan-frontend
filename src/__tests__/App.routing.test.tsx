import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";

vi.mock("../lib/api", () => import("../test/apiMock"));

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;

/** Renders the real App (its own BrowserRouter) at a URL. */
function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

// Phase 16F.1: unknown URLs are noindex not-found pages, and a missing
// language prefix is redirected under /uz instead of rendering the homepage.
describe("App routing — not-found handling", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders a noindex not-found page for an unknown path under a language", async () => {
    renderAt("/uz/no-such-page");

    expect(await screen.findByText("Sahifa topilmadi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bosh sahifaga qaytish" })).toHaveAttribute("href", "/uz");
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
    expect(document.title).toBe("Sahifa topilmadi — My Andijan");
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it("localises the not-found page and catches nested unknown paths", async () => {
    renderAt("/ru/no/such/page");

    expect(await screen.findByText("Страница не найдена")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
  });

  it("moves a path with no supported language prefix under /uz, reaching the not-found page", async () => {
    renderAt("/xyz/abc?ref=1");

    expect(await screen.findByText("Sahifa topilmadi")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/uz/xyz/abc");
    expect(window.location.search).toBe("?ref=1");
  });

  it("moves a real route missing its prefix to the prefixed route instead of the homepage", async () => {
    renderAt("/events");

    await waitFor(() => expect(window.location.pathname).toBe("/uz/events"));
    await waitFor(() => expect(document.title).toBe("Tadbirlar — My Andijan"));
    expect(screen.queryByText("Sahifa topilmadi")).not.toBeInTheDocument();
  });

  it("does not swallow real routes", async () => {
    renderAt("/uz/events");

    await waitFor(() => expect(document.title).toBe("Tadbirlar — My Andijan"));
    expect(screen.queryByText("Sahifa topilmadi")).not.toBeInTheDocument();
    expect(robots()).toBeNull();
  });
});
