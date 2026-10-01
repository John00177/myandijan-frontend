import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import MenuSection from "../MenuSection";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import {
  ApiError,
  createMenuItem,
  deleteMenuItem,
  getBusinessMenu,
  mockMenuItem,
} from "../../../test/apiMock";

function renderMenuSection({ canManage = false, lang = "uz" }: { canManage?: boolean; lang?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[`/${lang}/business/soy-milliy-taomlar`]}>
      <Routes>
        <Route
          path="/:lang/business/:slug"
          element={
            <LanguageProvider>
              <MenuSection businessId={mockMenuItem.businessId} canManage={canManage} />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MenuSection (customer-facing catalog)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBusinessMenu.mockResolvedValue([mockMenuItem]);
    createMenuItem.mockResolvedValue(mockMenuItem);
    deleteMenuItem.mockResolvedValue(undefined);
  });

  it("renders the real catalog returned by the public menu endpoint", async () => {
    renderMenuSection();

    expect(await screen.findByText(mockMenuItem.name)).toBeInTheDocument();
    expect(getBusinessMenu).toHaveBeenCalledWith(mockMenuItem.businessId);
    expect(screen.getByText(mockMenuItem.description as string)).toBeInTheDocument();
    expect(screen.getByText(/so'm/)).toBeInTheDocument();
  });

  it("shows the empty state when the business has no published items", async () => {
    getBusinessMenu.mockResolvedValue([]);

    renderMenuSection();

    expect(await screen.findByText("Menyu hali yo'q")).toBeInTheDocument();
  });

  it("reports a failed request as an error, not as an empty menu", async () => {
    getBusinessMenu.mockRejectedValue(new ApiError("Server error", 500));

    renderMenuSection();

    expect(await screen.findByText("Menyuni yuklab bo'lmadi")).toBeInTheDocument();
    expect(screen.queryByText("Menyu hali yo'q")).not.toBeInTheDocument();
  });

  it("retries the request from the error state", async () => {
    getBusinessMenu.mockRejectedValueOnce(new ApiError("Server error", 500));

    renderMenuSection();
    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));

    expect(await screen.findByText(mockMenuItem.name)).toBeInTheDocument();
    expect(getBusinessMenu).toHaveBeenCalledTimes(2);
  });

  it("is localized for the active language", async () => {
    getBusinessMenu.mockRejectedValue(new ApiError("Server error", 500));

    renderMenuSection({ lang: "ru" });

    expect(await screen.findByText("Не удалось загрузить меню")).toBeInTheDocument();
  });

  it("shows no management controls to a customer", async () => {
    renderMenuSection({ canManage: false });
    await screen.findByText(mockMenuItem.name);

    expect(screen.queryByRole("button", { name: /Taom qo'shish/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "O'chirish" })).not.toBeInTheDocument();
  });

  it("lets the owner add an item inline through the real API", async () => {
    getBusinessMenu.mockResolvedValue([]);
    createMenuItem.mockResolvedValue({ ...mockMenuItem, id: 2, name: "Shashlik" });

    renderMenuSection({ canManage: true });
    fireEvent.click(await screen.findByRole("button", { name: /Taom qo'shish/ }));
    fireEvent.change(screen.getByPlaceholderText("Nomi *"), { target: { value: "Shashlik" } });
    fireEvent.change(screen.getByPlaceholderText("Narxi (so'm) *"), { target: { value: "30000" } });
    fireEvent.click(screen.getByRole("button", { name: /Taom qo'shish/ }));

    await waitFor(() =>
      expect(createMenuItem).toHaveBeenCalledWith(
        mockMenuItem.businessId,
        expect.objectContaining({ name: "Shashlik", price: 30000 }),
      ),
    );
    expect(await screen.findByText("Shashlik")).toBeInTheDocument();
  });

  it("lets the owner delete an item through the real API", async () => {
    renderMenuSection({ canManage: true });
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: "O'chirish" }));

    await waitFor(() => expect(deleteMenuItem).toHaveBeenCalledWith(mockMenuItem.id));
    await waitFor(() => expect(screen.queryByText(mockMenuItem.name)).not.toBeInTheDocument());
  });
});
