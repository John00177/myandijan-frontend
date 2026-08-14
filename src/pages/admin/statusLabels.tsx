import Badge from "../../components/ui/Badge";
import type { UserRole } from "../../types";

type Tone = "blue" | "success" | "danger" | "amber" | "neutral";

/**
 * Status strings are normalized case-insensitively. The API's real business
 * status values could not be observed (admin endpoints need an ADMIN token), but
 * the user objects it does return use SCREAMING_CASE ("ACTIVE", "CUSTOMER"), so
 * that is the assumed convention — matching loosely means a lowercase variant
 * still renders correctly instead of falling through to "unknown".
 */
const BUSINESS_STATUS: Record<string, { label: string; tone: Tone }> = {
  approved: { label: "Tasdiqlangan", tone: "success" },
  active: { label: "Tasdiqlangan", tone: "success" },
  published: { label: "Tasdiqlangan", tone: "success" },
  pending: { label: "Kutilmoqda", tone: "amber" },
  rejected: { label: "Rad etilgan", tone: "danger" },
};

export function BusinessStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const entry = BUSINESS_STATUS[status.toLowerCase()];
  // Unknown values are shown verbatim rather than mislabelled.
  return <Badge tone={entry?.tone ?? "neutral"}>{entry?.label ?? status}</Badge>;
}

const ROLE_LABELS: Record<UserRole, { label: string; tone: Tone }> = {
  CUSTOMER: { label: "Mijoz", tone: "blue" },
  BUSINESS_OWNER: { label: "Biznes egasi", tone: "amber" },
  ADMIN: { label: "Admin", tone: "danger" },
};

export function RoleBadge({ role }: { role: string | null | undefined }) {
  if (!role) return <Badge tone="neutral">—</Badge>;
  const entry = ROLE_LABELS[role.toUpperCase() as UserRole];
  return <Badge tone={entry?.tone ?? "neutral"}>{entry?.label ?? role}</Badge>;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
}
