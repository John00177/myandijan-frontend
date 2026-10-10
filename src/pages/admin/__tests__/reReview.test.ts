import { describe, expect, it } from "vitest";
import { reReviewReason } from "../reReview";

describe("reReviewReason (Phase 16I.1)", () => {
  it("returns the trimmed reason a PENDING listing still carries", () => {
    expect(reReviewReason({ status: "PENDING", rejectionReason: "  Rasm yo'q  " })).toBe("Rasm yo'q");
    expect(reReviewReason({ status: "pending", rejectionReason: "Rasm yo'q" })).toBe("Rasm yo'q");
  });

  it("returns null for a first-time PENDING submission or a blank reason", () => {
    expect(reReviewReason({ status: "PENDING", rejectionReason: null })).toBeNull();
    expect(reReviewReason({ status: "PENDING" })).toBeNull();
    expect(reReviewReason({ status: "PENDING", rejectionReason: "   " })).toBeNull();
  });

  it("returns null for every other status, whose reason (if any) is the current one", () => {
    for (const status of ["DRAFT", "APPROVED", "REJECTED", "SUSPENDED", "HIDDEN", null, undefined]) {
      expect(reReviewReason({ status, rejectionReason: "Sabab" })).toBeNull();
    }
  });
});
