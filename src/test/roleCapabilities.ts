import type { Capability } from "../lib/capabilities";

/**
 * TEST DATA ONLY — what the server returns as `capabilities` for each role
 * (backend src/authz/capabilities.ts, D-75), so tests can sign users in the
 * way production does. The app itself never maps roles to capabilities: it
 * renders from the list the server sends.
 */
const MEMBER: Capability[] = ["review.write", "review.report"];
const OWNER: Capability[] = ["business.claim", "business.create", "business.manage_own"];
const MODERATION: Capability[] = ["business.review", "review.moderate", "report.resolve"];
const OPERATIONS: Capability[] = [
  "business.operate",
  "business.edit_any",
  "claim.review",
  "event.review",
  "taxonomy.manage",
  "user.pii.read",
  "user.status.manage",
  "audit.read",
  "analytics.platform",
];

export const ROLE_CAPABILITIES: Record<string, Capability[]> = {
  CUSTOMER: [...MEMBER, "business.claim"],
  BUSINESS_OWNER: [...MEMBER, ...OWNER],
  SUPPORT: [...MEMBER],
  MODERATOR: [...MEMBER, ...MODERATION],
  ADMIN: [...MEMBER, ...OWNER, ...MODERATION, ...OPERATIONS],
  SUPER_ADMIN: [...MEMBER, ...OWNER, ...MODERATION, ...OPERATIONS, "business.hide", "business.delete", "analytics.users"],
};

/** A signed-in user object as the server would return it for this role. */
export function testUser(role: string, id = 1) {
  return { id, fullName: "Test", phone: "+998901234567", role, capabilities: ROLE_CAPABILITIES[role] ?? [] };
}
