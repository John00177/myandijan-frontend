import Badge from "../../../components/ui/Badge";
import { ACTIVITY_BADGE_TONES, ADMIN_AUDIT_LOGS, type AdminAuditLog } from "../adminMockData";
import DataTable, { type Column } from "../DataTable";

export default function AdminAuditLogsView() {
  // /admin/audit-logs returns 404 — this table is mock. See adminMockData.ts.
  const columns: Column<AdminAuditLog>[] = [
    { key: "at", header: "Vaqt", render: (l) => <span className="text-ink-muted whitespace-nowrap">{l.at}</span> },
    { key: "actor", header: "Foydalanuvchi", render: (l) => <span className="text-ink">{l.actor}</span> },
    {
      key: "action",
      header: "Harakat",
      render: (l) => <Badge tone={ACTIVITY_BADGE_TONES[l.kind]}>{l.action}</Badge>,
    },
    { key: "details", header: "Tafsilotlar", render: (l) => <span className="text-ink-body">{l.details}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={ADMIN_AUDIT_LOGS}
      keyOf={(l) => l.id}
      emptyTitle="Audit yozuvlari yo'q"
      mobileHeader={(l) => <Badge tone={ACTIVITY_BADGE_TONES[l.kind]}>{l.action}</Badge>}
    />
  );
}
