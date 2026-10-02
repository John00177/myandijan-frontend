import type { Capability } from "../../lib/capabilities";

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
 * The capability each admin view's data requires on the server (D-75). A view
 * is shown — in the sidebar and as a render target — only if the signed-in
 * user holds it; otherwise its endpoints would 403 anyway. UX only.
 */
export const VIEW_CAPABILITY: Record<AdminView, Capability> = {
  home: "analytics.platform",
  analytics: "analytics.users",
  businesses: "business.review",
  categories: "taxonomy.manage",
  users: "user.pii.read",
  reviews: "review.moderate",
  reports: "report.resolve",
  claims: "claim.review",
  events: "event.review",
  regions: "taxonomy.manage",
  audit: "audit.read",
  // Client-only platform settings screen; kept with the other platform
  // configuration (taxonomy) capability.
  settings: "taxonomy.manage",
};

/** Sidebar / landing order. */
export const VIEW_ORDER: readonly AdminView[] = [
  "home",
  "analytics",
  "businesses",
  "categories",
  "users",
  "reviews",
  "reports",
  "claims",
  "events",
  "regions",
  "audit",
  "settings",
];

export function canOpenView(view: AdminView, can: (capability: Capability) => boolean): boolean {
  return can(VIEW_CAPABILITY[view]);
}

/** The first view this user may open, or null when the admin panel has nothing for them. */
export function firstOpenView(can: (capability: Capability) => boolean): AdminView | null {
  return VIEW_ORDER.find((view) => canOpenView(view, can)) ?? null;
}
