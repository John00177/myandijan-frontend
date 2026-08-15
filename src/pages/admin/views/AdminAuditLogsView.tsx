import { useCallback } from "react";
import Badge from "../../../components/ui/Badge";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getAdminAuditLogs } from "../../../lib/api";
import type { AdminAuditLog } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import { ACTION_BADGE_TONES, describeAuditLog } from "../auditFormat";
import DataTable, { type Column } from "../DataTable";
import { formatDate } from "../statusLabels";

export default function AdminAuditLogsView() {
  const fetcher = useCallback(() => getAdminAuditLogs({ limit: 100 }), []);
  const { data, state, status } = useAdminResource(fetcher);

  const stateEl = renderAdminState(state, status);
  if (stateEl) return stateEl;

  const rows = data?.data ?? [];

  const columns: Column<AdminAuditLog>[] = [
    { key: "at", header: "Vaqt", render: (l) => <span className="text-ink-muted whitespace-nowrap">{formatDate(l.createdAt)}</span> },
    { key: "actor", header: "Foydalanuvchi", render: (l) => <span className="text-ink">{l.actor?.fullName ?? "Tizim"}</span> },
    {
      key: "action",
      header: "Harakat",
      render: (l) => <Badge tone={ACTION_BADGE_TONES[l.action]}>{describeAuditLog(l)}</Badge>,
    },
    { key: "details", header: "Tafsilotlar", render: (l) => <span className="text-ink-body">{l.note ?? "—"}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      keyOf={(l) => l.id}
      loading={state === "loading"}
      emptyTitle="Audit yozuvlari yo'q"
      mobileHeader={(l) => <Badge tone={ACTION_BADGE_TONES[l.action]}>{describeAuditLog(l)}</Badge>}
    />
  );
}
