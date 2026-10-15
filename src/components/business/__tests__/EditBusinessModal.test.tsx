import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import EditBusinessModal from "../EditBusinessModal";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import { getAdminBusinessById, getAdminBusinessEditDetail, getBusinessById } from "../../../test/apiMock";

// Phase 16E.5 added an optional `loadDetail` prop for the admin flow. The
// owner dashboard (MyBusinessesView) passes neither it nor
// `preserveUnchangedHours`, and must behave exactly as before.
describe("EditBusinessModal — owner usage is unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderAsOwnerDashboard() {
    return render(
      <MemoryRouter initialEntries={["/uz/dashboard"]}>
        <Routes>
          <Route
            path="/:lang/dashboard"
            element={
              <LanguageProvider>
                <EditBusinessModal
                  open
                  businessId={5}
                  initial={{ id: 5, name: "Soy milliy taomlar", status: "APPROVED" }}
                  onClose={() => {}}
                  onSave={() => {}}
                />
              </LanguageProvider>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("prefills from the public GET /businesses/:id and never calls the admin detail", async () => {
    renderAsOwnerDashboard();

    await waitFor(() => expect(getBusinessById).toHaveBeenCalledWith(5));
    expect(getAdminBusinessEditDetail).not.toHaveBeenCalled();
    expect(getAdminBusinessById).not.toHaveBeenCalled();
  });

  it("keeps the editable hours grid (no admin-only lock or 24-hour labelling)", async () => {
    renderAsOwnerDashboard();

    await waitFor(() => expect(getBusinessById).toHaveBeenCalled());
    expect((await screen.findAllByDisplayValue("09:00")).length).toBe(7);
    expect(screen.queryByText("Ish vaqtini yuklab bo'lmadi. Saqlaganda ish vaqti o'zgarmaydi.")).not.toBeInTheDocument();
  });
});
