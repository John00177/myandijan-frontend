import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import EventDetailPage from "../EventDetailPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { attendEvent, mockEvent } from "../../test/apiMock";

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
});
