import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import InventoryView from "../InventoryView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import {
  ApiError,
  createMenuItem,
  deleteMenuItem,
  getMyBusinessMenu,
  getMyBusinesses,
  mockMenuItem,
  mockMyBusiness,
  updateMenuItem,
  uploadImage,
} from "../../../../test/apiMock";

// KpiCard calls useNavigate and LanguageProvider reads :lang from the route,
// so the view needs a real router around it.
function renderInventoryView() {
  return render(
    <MemoryRouter initialEntries={["/uz/dashboard"]}>
      <Routes>
        <Route
          path="/:lang/dashboard"
          element={
            <LanguageProvider>
              <InventoryView />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const secondBusiness = { ...mockMyBusiness, id: 2, slug: "huzur-kafe", name: "Huzur Kafe" };

describe("InventoryView (owner catalog)", () => {
  // Clear call history but always reinstall a resolved default: a reload()
  // still settling from the previous test must never hit a bare vi.fn() that
  // returns undefined.
  beforeEach(() => {
    vi.clearAllMocks();
    getMyBusinesses.mockResolvedValue([mockMyBusiness]);
    getMyBusinessMenu.mockResolvedValue([mockMenuItem]);
    createMenuItem.mockResolvedValue(mockMenuItem);
    updateMenuItem.mockResolvedValue(mockMenuItem);
    deleteMenuItem.mockResolvedValue(undefined);
    uploadImage.mockResolvedValue({ url: "https://example.test/photo.jpg" });

    // jsdom has no blob URL support; ProductModal previews the picked photo.
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  it("loads the real catalog for the owner's business", async () => {
    renderInventoryView();

    expect(await screen.findByText(mockMenuItem.name)).toBeInTheDocument();
    expect(getMyBusinessMenu).toHaveBeenCalledWith(mockMyBusiness.id);
    expect(screen.getByText("1 ta mahsulot")).toBeInTheDocument();
  });

  it("shows no demo-mode banner and no stock-keeping fields", async () => {
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    expect(screen.queryByText(/Demo rejimi/)).not.toBeInTheDocument();
    expect(screen.queryByText(/SKU/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Soni:/)).not.toBeInTheDocument();
  });

  it("shows an empty state when the business has no catalog items", async () => {
    getMyBusinessMenu.mockResolvedValue([]);

    renderInventoryView();

    expect(await screen.findByText("Hozircha mahsulot yo'q")).toBeInTheDocument();
  });

  it("tells an owner with no businesses to add one first, without fetching a catalog", async () => {
    getMyBusinesses.mockResolvedValue([]);

    renderInventoryView();

    expect(await screen.findByText("Avval biznes qo'shing")).toBeInTheDocument();
    expect(getMyBusinessMenu).not.toHaveBeenCalled();
  });

  it("surfaces a permission failure distinctly from a generic error", async () => {
    getMyBusinessMenu.mockRejectedValue(new ApiError("Forbidden", 403));

    renderInventoryView();

    expect(await screen.findByText("Katalogni yuklab bo'lmadi")).toBeInTheDocument();
    expect(screen.getByText("Bu biznes katalogini boshqarishga ruxsatingiz yo'q.")).toBeInTheDocument();
  });

  it("shows a retryable error state when the catalog request fails", async () => {
    getMyBusinessMenu.mockRejectedValue(new ApiError("Server error", 500));

    renderInventoryView();

    expect(await screen.findByText("Katalogni yuklab bo'lmadi")).toBeInTheDocument();
    expect(screen.getByText(/So'rov bajarilmadi \(500\)/)).toBeInTheDocument();
  });

  it("creates an item through the real API and reloads the list", async () => {
    createMenuItem.mockResolvedValue(mockMenuItem);
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: /yangi mahsulot/i }));
    fireEvent.change(screen.getByLabelText("Nomi"), { target: { value: "Shashlik" } });
    fireEvent.change(screen.getByLabelText("Narxi (so'm)"), { target: { value: "30000" } });
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() =>
      expect(createMenuItem).toHaveBeenCalledWith(
        mockMyBusiness.id,
        expect.objectContaining({ name: "Shashlik", price: 30000, type: "PRODUCT" }),
      ),
    );
    expect(await screen.findByText("Mahsulot qo'shildi")).toBeInTheDocument();
    expect(getMyBusinessMenu).toHaveBeenCalledTimes(2);
  });

  it("creates a SERVICE item when the service type is chosen", async () => {
    createMenuItem.mockResolvedValue(mockMenuItem);
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: /yangi mahsulot/i }));
    fireEvent.change(screen.getByLabelText("Nomi"), { target: { value: "Soch olish" } });
    fireEvent.change(screen.getByLabelText("Narxi (so'm)"), { target: { value: "40000" } });
    fireEvent.click(screen.getByRole("button", { name: "Xizmat" }));
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() =>
      expect(createMenuItem).toHaveBeenCalledWith(mockMyBusiness.id, expect.objectContaining({ type: "SERVICE" })),
    );
  });

  it("edits an existing item via PATCH rather than creating a duplicate", async () => {
    updateMenuItem.mockResolvedValue(mockMenuItem);
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: "Tahrirlash" }));
    fireEvent.change(screen.getByLabelText("Nomi"), { target: { value: "Osh (katta)" } });
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() =>
      expect(updateMenuItem).toHaveBeenCalledWith(mockMenuItem.id, expect.objectContaining({ name: "Osh (katta)" })),
    );
    expect(createMenuItem).not.toHaveBeenCalled();
  });

  it("uploads a chosen photo before saving and sends the returned URL", async () => {
    createMenuItem.mockResolvedValue(mockMenuItem);
    uploadImage.mockResolvedValue({ url: "https://example.test/photo.jpg" });
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: /yangi mahsulot/i }));
    fireEvent.change(screen.getByLabelText("Nomi"), { target: { value: "Lagmon" } });
    fireEvent.change(screen.getByLabelText("Narxi (so'm)"), { target: { value: "28000" } });

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file));
    expect(createMenuItem).toHaveBeenCalledWith(
      mockMyBusiness.id,
      expect.objectContaining({ photo: "https://example.test/photo.jpg" }),
    );
  });

  it("reports a save failure in the modal instead of closing it", async () => {
    createMenuItem.mockRejectedValue(new ApiError("Narx noto'g'ri", 400));
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: /yangi mahsulot/i }));
    fireEvent.change(screen.getByLabelText("Nomi"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Narxi (so'm)"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Saqlash" }));

    expect(await screen.findByText("Narx noto'g'ri")).toBeInTheDocument();
    expect(screen.getByLabelText("Nomi")).toBeInTheDocument();
  });

  it("deactivates a published item through PATCH isActive:false", async () => {
    updateMenuItem.mockResolvedValue({ ...mockMenuItem, isActive: false });
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: "Yashirish" }));

    await waitFor(() => expect(updateMenuItem).toHaveBeenCalledWith(mockMenuItem.id, { isActive: false }));
    expect(await screen.findByText("Mahsulot yashirildi")).toBeInTheDocument();
  });

  it("reactivates a hidden item through PATCH isActive:true", async () => {
    getMyBusinessMenu.mockResolvedValue([{ ...mockMenuItem, isActive: false }]);
    updateMenuItem.mockResolvedValue(mockMenuItem);
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    expect(screen.getByText("Yashirilgan")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "E'lon qilish" }));

    await waitFor(() => expect(updateMenuItem).toHaveBeenCalledWith(mockMenuItem.id, { isActive: true }));
  });

  it("deletes an item only after the inline confirmation", async () => {
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.click(screen.getByRole("button", { name: "O'chirish" }));
    expect(deleteMenuItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ha, o'chirish" }));

    await waitFor(() => expect(deleteMenuItem).toHaveBeenCalledWith(mockMenuItem.id));
    expect(await screen.findByText("Mahsulot o'chirildi")).toBeInTheDocument();
  });

  it("refetches the catalog when the owner switches business", async () => {
    getMyBusinesses.mockResolvedValue([mockMyBusiness, secondBusiness]);
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    fireEvent.change(screen.getByLabelText("Biznes"), { target: { value: String(secondBusiness.id) } });

    await waitFor(() => expect(getMyBusinessMenu).toHaveBeenLastCalledWith(secondBusiness.id));
  });

  it("hides the business picker for an owner with a single business", async () => {
    renderInventoryView();
    await screen.findByText(mockMenuItem.name);

    expect(screen.queryByLabelText("Biznes")).not.toBeInTheDocument();
  });
});
