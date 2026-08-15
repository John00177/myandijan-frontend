import { Building2, Plus } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getMyBusinesses } from "../../../lib/api";
import type { BusinessStatusValue } from "../../../types";

const STATUS_LABEL: Record<BusinessStatusValue, string> = {
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  SUSPENDED: "To'xtatilgan",
};

const STATUS_TONE: Record<BusinessStatusValue, "success" | "amber" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  PENDING: "amber",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export default function MyBusinessesView() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const fetcher = useCallback(() => getMyBusinesses(), []);
  const { data: businesses, state, status, reload } = useAdminResource(fetcher);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${businesses?.length ?? 0} ta biznes` : "Bizneslar"}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(`/${lang}/dashboard/business/new`)}>
          <Plus size={16} />
          Yangi biznes qo'shish
        </Button>
      </div>

      {state === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      )}

      {(state === "forbidden" || state === "error") && (
        <EmptyState
          icon={Building2}
          title="Ma'lumotni yuklab bo'lmadi"
          body={status ? `So'rov bajarilmadi (${status}). Qayta urinib ko'ring.` : "So'rov bajarilmadi. Qayta urinib ko'ring."}
          actionLabel="Qayta urinish"
          onAction={reload}
        />
      )}

      {state === "ok" && businesses?.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Hozircha biznesingiz yo'q"
          body="Birinchi biznesingizni qo'shib, uni platformada ko'rsating."
          actionLabel="Birinchi bo'lib qo'shing"
          onAction={() => navigate(`/${lang}/dashboard/business/new`)}
        />
      )}

      {state === "ok" && businesses && businesses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((business) => {
            const branch = business.branches[0];
            return (
              <div key={business.id} className="bg-card border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22]" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink truncate">{business.name}</span>
                    <Badge tone={STATUS_TONE[business.status]}>{STATUS_LABEL[business.status]}</Badge>
                  </div>
                  <div className="text-xs text-ink-muted mt-1">
                    {business.category?.nameUz ?? "—"}
                    {branch?.district ? ` · ${branch.district.nameUz}` : ""}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate(`/${lang}/dashboard/business/${business.id}/edit`)}
                  >
                    Tahrirlash
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
