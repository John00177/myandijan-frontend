import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import EventDetailPage from "../EventDetailPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { ApiError, attendEvent, getEventBySlug, mockEvent } from "../../test/apiMock";

function renderEventDetailPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/uz/events/${mockEvent.slug}`]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/events/:slug"
              element={
                <LanguageProvider>
                  <EventDetailPage />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("EventDetailPage", () => {
  it("renders the event title and description once loaded", async () => {
    renderEventDetailPage();

    expect(await screen.findByText(mockEvent.title)).toBeInTheDocument();
    expect(screen.getByText(mockEvent.description)).toBeInTheDocument();
  });

  it("prompts an unauthenticated visitor to log in instead of RSVPing", async () => {
    renderEventDetailPage();

    const rsvpButton = await screen.findByRole("button", { name: /ishtirok etaman/i });
    fireEvent.click(rsvpButton);

    await waitFor(() => expect(attendEvent).not.toHaveBeenCalled());
  });

  // Phase 16F.1: not-found states are never indexable.
  it("marks a confirmed not-found (404) noindex with a not-found title", async () => {
    getEventBySlug.mockRejectedValueOnce(new ApiError("Event not found", 404));
    renderEventDetailPage();

    expect(await screen.findByText("Tadbir topilmadi")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow"),
    );
    expect(document.title).toBe("Tadbir topilmadi — My Andijan");
  });
});
