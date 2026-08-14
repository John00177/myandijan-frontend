import { ShieldAlert, TriangleAlert } from "lucide-react";
import EmptyState from "../../components/ui/EmptyState";
import type { AdminFetchState } from "../../hooks/useAdminResource";

/**
 * Renders the two non-success outcomes of an /admin/* fetch. Kept separate from a
 * generic "no data" empty state so a permissions failure never masquerades as an
 * empty list — the distinction matters when debugging why a panel looks blank.
 *
 * The real status is passed through rather than assumed: 401 means the token is
 * not valid at all, 403 means it is valid but lacks ADMIN. Reporting one when it
 * was the other sends you debugging in the wrong direction.
 */
function forbiddenBody(status: number | null): string {
  if (status === 401) {
    return "Tokeningiz yaroqsiz yoki muddati tugagan (401). ADMIN hisobi bilan qayta kiring.";
  }
  if (status === 403) {
    return "Hisobingizda ADMIN huquqi yo'q (403).";
  }
  return "Server so'rovni rad etdi. ADMIN hisobi bilan kiring.";
}

export function AdminForbidden({ status = null }: { status?: number | null }) {
  return <EmptyState icon={ShieldAlert} title="Admin huquqi talab qilinadi" body={forbiddenBody(status)} />;
}

export function AdminError({ status = null }: { status?: number | null }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Ma'lumotni yuklab bo'lmadi"
      body={status ? `So'rov bajarilmadi (${status}). Keyinroq qayta urinib ko'ring.` : "So'rov bajarilmadi. Keyinroq qayta urinib ko'ring."}
    />
  );
}

/** Returns the element for a non-ok state, or null when the fetch succeeded. */
export function renderAdminState(state: AdminFetchState, status: number | null = null) {
  if (state === "forbidden") return <AdminForbidden status={status} />;
  if (state === "error") return <AdminError status={status} />;
  return null;
}
