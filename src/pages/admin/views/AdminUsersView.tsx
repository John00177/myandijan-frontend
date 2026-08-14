import { Ban, Eye } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getAdminUsers } from "../../../lib/api";
import type { AdminUser } from "../../../types";
import Pagination from "../../search/Pagination";
import { renderAdminState } from "../AdminFetchState";
import DataTable, { type Column } from "../DataTable";
import { RoleBadge, formatDate } from "../statusLabels";

const PAGE_SIZE = 20;

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

export default function AdminUsersView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetcher = useCallback(() => getAdminUsers({ page, limit: PAGE_SIZE }), [page]);
  const { data, state, status } = useAdminResource(fetcher);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (!search) return items;
    const needle = search.toLowerCase();
    return items.filter(
      (u) => (u.fullName ?? "").toLowerCase().includes(needle) || (u.phone ?? "").includes(search),
    );
  }, [data, search]);

  const columns: Column<AdminUser>[] = [
    { key: "id", header: "ID", render: (u) => <span className="text-ink-muted">#{u.id}</span>, hideOnMobile: true },
    { key: "name", header: "Ism", render: (u) => <span className="font-medium text-ink">{u.fullName ?? "—"}</span> },
    { key: "phone", header: "Telefon", render: (u) => u.phone ?? "—" },
    { key: "role", header: "Rol", render: (u) => <RoleBadge role={u.role} /> },
    { key: "date", header: "Sana", render: (u) => formatDate(u.createdAt) },
    {
      key: "actions",
      header: "Harakatlar",
      hideOnMobile: true,
      render: () => (
        <div className="flex items-center gap-1">
          <button
            aria-label="Ko'rish"
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            aria-label="Bloklash"
            className="size-8 rounded-lg text-ink-muted hover:text-warning hover:bg-warning/10 flex items-center justify-center transition-colors"
          >
            <Ban size={16} />
          </button>
        </div>
      ),
    },
  ];

  const stateEl = renderAdminState(state, status);

  return (
    <div>
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          className={`${inputClasses} w-full sm:max-w-sm`}
        />
      </div>

      {stateEl ?? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            keyOf={(u) => u.id}
            loading={state === "loading"}
            emptyTitle="Foydalanuvchilar topilmadi"
            mobileHeader={(u) => <div className="font-semibold text-ink">{u.fullName ?? `#${u.id}`}</div>}
          />
          {data?.total != null && (
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
