import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { getBusiness, mockBusiness, recordBusinessView } from "../../test/apiMock";
import { useBusiness } from "../useBusiness";

// Phase 16G.2: which business-page loads are recorded as a view.

const OWNER_ID = 7;

describe("useBusiness — view recording", () => {
  beforeEach(() => {
    vi.mocked(recordBusinessView).mockClear();
    vi.mocked(getBusiness).mockReset().mockResolvedValue({ ...mockBusiness, id: 5, ownerId: OWNER_ID });
  });

  async function load(viewer?: { id: number } | null) {
    const hook = renderHook(() => useBusiness("soy-milliy-taomlar", "uz", viewer));
    await waitFor(() => expect(hook.result.current.business).not.toBeNull());
    return hook;
  }

  it("records a view for an anonymous visitor", async () => {
    await load(null);
    expect(recordBusinessView).toHaveBeenCalledTimes(1);
    expect(recordBusinessView).toHaveBeenCalledWith(5);
  });

  it("records a view for a signed-in visitor who is not the owner", async () => {
    await load({ id: 99 });
    expect(recordBusinessView).toHaveBeenCalledWith(5);
  });

  it("does not record the owner opening their own listing", async () => {
    await load({ id: OWNER_ID });
    expect(recordBusinessView).not.toHaveBeenCalled();
  });

  it("records a view on an unowned listing for any signed-in user", async () => {
    vi.mocked(getBusiness).mockResolvedValue({ ...mockBusiness, id: 5, ownerId: null });
    await load({ id: OWNER_ID });
    expect(recordBusinessView).toHaveBeenCalledTimes(1);
  });

  it("does not record a second view when the page reloads its data", async () => {
    const { result } = await load(null);
    act(() => result.current.reload());
    await waitFor(() => expect(getBusiness).toHaveBeenCalledTimes(2));
    expect(recordBusinessView).toHaveBeenCalledTimes(1);
  });
});
