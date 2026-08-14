import { Eye, Pencil, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { useCategories } from "../../../hooks/useCategories";
import { useLanguage } from "../../../contexts/LanguageContext";
import { getAdminBusinesses } from "../../../lib/api";
import { localizedName } from "../../../lib/localize";
import type { AdminBusiness } from "../../../types";
import Pagination from "../../search/Pagination";
import { renderAdminState } from "../AdminFetchState";
import DataTable, { type Column } from "../DataTable";
import { BusinessStatusBadge, formatDate } from "../statusLabels";

const PAGE_SIZE = 20;

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

/** Business names arrive either as nameUz/Ru/En or a flat `name`, depending on serializer. */
function businessName(b: AdminBusiness): string {
  return b.nameUz ?? b.name ?? b.nameRu ?? b.nameEn ?? `#${b.id}`;
}

export default function AdminBusinessesView() {
  const { lang } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetcher = useCallback(() => getAdminBusinesses({ page, limit: PAGE_SIZE }), [page]);
  const { data, state, status } = useAdminResource(fetcher);
  const { categories } = useCategories(lang);

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((b) => {
      if (search && !businessName(b).toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && (b.status ?? "").toLowerCase() !== statusFilter) return false;
      if (categoryFilter && b.category?.slug !== categoryFilter) return false;
      return true;
    });
  }, [data, search, statusFilter, categoryFilter]);

  const columns: Column<AdminBusiness>[] = [
    { key: "id", header: "ID", render: (b) => <span className="text-ink-muted">#{b.id}</span>, hideOnMobile: true },
    { key: "name", header: "Nomi", render: (b) => <span className="font-medium text-ink">{businessName(b)}</span> },
    { key: "owner", header: "Egasi", render: (b) => b.owner?.fullName ?? b.owner?.phone ?? "—" },
    { key: "category", header: "Turkum", render: (b) => b.category?.nameUz ?? "—" },
    { key: "district", header: "Tuman", render: (b) => b.district?.nameUz ?? "—" },
    { key: "status", header: "Status", render: (b) => <BusinessStatusBadge status={b.status} /> },
    { key: "date", header: "Sana", render: (b) => formatDate(b.createdAt) },
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
            aria-label="Tahrirlash"
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            aria-label="O'chirish"
            className="size-8 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const stateEl = renderAdminState(state, status);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nomi bo'yicha qidirish..."
          className={`${inputClasses} flex-1`}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClasses}>
          <option value="">Barcha statuslar</option>
          <option value="approved">Tasdiqlangan</option>
          <option value="pending">Kutilmoqda</option>
          <option value="rejected">Rad etilgan</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClasses}>
          <option value="">Barcha turkumlar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {localizedName(c, lang)}
            </option>
          ))}
        </select>
      </div>

      {stateEl ?? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            keyOf={(b) => b.id}
            loading={state === "loading"}
            emptyTitle="Bizneslar topilmadi"
            emptyBody="Filtrlarni o'zgartirib ko'ring."
            mobileHeader={(b) => <div className="font-semibold text-ink">{businessName(b)}</div>}
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
