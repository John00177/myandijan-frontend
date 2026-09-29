import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSearchBusinesses } from "../useSearchBusinesses";

vi.mock("../../lib/api", () => ({
  searchBusinesses: vi.fn(),
  recordSearch: vi.fn(),
}));

import { recordSearch, searchBusinesses } from "../../lib/api";

describe("useSearchBusinesses — search-analytics wiring", () => {
  afterEach(() => {
    vi.mocked(searchBusinesses).mockReset();
    vi.mocked(recordSearch).mockReset();
  });

  it("records a search with the resolved result count when a text query is present", async () => {
    vi.mocked(searchBusinesses).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
    });

    const { result } = renderHook(() =>
      useSearchBusinesses({ search: "osh", district: 2, page: 1, limit: 20, lang: "uz" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(recordSearch).toHaveBeenCalledTimes(1);
    expect(recordSearch).toHaveBeenCalledWith({
      query: "osh",
      districtId: 2,
      cityId: undefined,
      resultCount: 3,
    });
  });

  it("does not record a search when only browsing by category/district with no text query", async () => {
    vi.mocked(searchBusinesses).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 5, totalPages: 1 },
    });

    const { result } = renderHook(() =>
      useSearchBusinesses({ category: "food", page: 1, limit: 20, lang: "uz" }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(recordSearch).not.toHaveBeenCalled();
  });
});
