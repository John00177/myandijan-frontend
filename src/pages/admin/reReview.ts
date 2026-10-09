import type { AdminBusiness } from "../../types";

/**
 * Phase 16I.1: the earlier moderation reason a PENDING listing still carries,
 * or null.
 *
 * Approve clears `rejectionReason` and a new reject overwrites it, so a
 * PENDING listing with a reason is one that is back in the queue after an
 * earlier decision: the owner resubmitted a rejected listing
 * (POST /me/businesses/:id/resubmit keeps the reason as context for this
 * re-review), or a SUPER_ADMIN unhid a listing with no recorded status, which
 * falls back to PENDING (D-73) — possibly after a suspension. The wording
 * stays neutral ("previous reason") because both paths land here.
 *
 * Any other status returns null: REJECTED/SUSPENDED show their reason as the
 * current one, and APPROVED never carries one.
 */
export function reReviewReason(b: Pick<AdminBusiness, "status" | "rejectionReason">): string | null {
  if ((b.status ?? "").toUpperCase() !== "PENDING") return null;
  return b.rejectionReason?.trim() || null;
}
