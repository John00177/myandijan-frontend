/**
 * Business content — profile, hours, catalog and review replies — is managed
 * by the business's OWNER only, whatever their role (Phase 15B, D-74). No
 * staff role grants it on someone else's business: MODERATOR and SUPPORT have
 * no business-edit authority, and ADMIN/SUPER_ADMIN edit other businesses only
 * through the audited admin panel (with a reason), never through these
 * owner-facing controls.
 *
 * UX only — the server enforces ownership on every one of these routes.
 */
export function ownsBusiness(
  user: { id: number } | null | undefined,
  ownerId: number | null | undefined,
): boolean {
  return !!user && ownerId != null && user.id === ownerId;
}
