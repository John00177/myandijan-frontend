export type AdminView =
  | "home"
  | "analytics"
  | "businesses"
  | "categories"
  | "users"
  | "reviews"
  | "reports"
  | "claims"
  | "events"
  | "regions"
  | "audit"
  | "settings";

/**
 * The only admin views a MODERATOR may open — each is backed by MODERATOR+
 * routes on the server (D-72). Every other view's data is ADMIN-only and would
 * 403, so it is neither shown in the sidebar nor rendered for a moderator.
 */
export const MODERATOR_VIEWS: readonly AdminView[] = ["businesses", "reviews", "reports"];

export function canOpenView(view: AdminView, isAdmin: boolean): boolean {
  return isAdmin || MODERATOR_VIEWS.includes(view);
}
