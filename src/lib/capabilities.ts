/**
 * Capabilities (Phase 15D, D-75). The server decides every request by
 * capability; it also returns the signed-in user's capability list on
 * GET /users/me and every auth response, and the UI renders from THAT list.
 *
 * This is display only — hiding a button is never the security boundary. If
 * the list is missing (e.g. a user object cached before 15D, until the
 * mount-time /users/me refresh lands) every check fails closed.
 */
export type Capability =
  | "review.write"
  | "review.report"
  | "business.claim"
  | "business.create"
  | "business.manage_own"
  | "business.review"
  | "review.moderate"
  | "report.resolve"
  | "business.operate"
  | "business.edit_any"
  | "business.hide"
  | "business.delete"
  | "claim.review"
  | "event.review"
  | "taxonomy.manage"
  | "user.pii.read"
  | "user.status.manage"
  | "audit.read"
  | "analytics.platform"
  | "analytics.users";

export function hasCapability(
  user: { capabilities?: readonly string[] } | null | undefined,
  capability: Capability,
): boolean {
  return !!user?.capabilities?.includes(capability);
}
