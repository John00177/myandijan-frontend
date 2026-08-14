import { MapPin, Plus } from "lucide-react";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useRegions } from "../../../hooks/useRegions";
import { localizedName } from "../../../lib/localize";

export default function AdminRegionsView() {
  // /geography/regions is public and real — no admin token needed here.
  const { lang } = useLanguage();
  const { regions, loading } = useRegions(lang);

  const districts = regions[0]?.districts ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{loading ? "Yuklanmoqda..." : `${districts.length} ta tuman`}</p>
        <Button variant="primary" size="sm">
          <Plus size={16} />
          Shahar qo'shish
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[96px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {districts.map((district) => (
            <div key={district.id} className="bg-card border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-ink truncate">{localizedName(district, lang)}</div>
                  <div className="text-xs text-ink-muted">/{district.slug}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-ink-muted">
                <span>{district.cities.length} ta shahar</span>
                {/* businessCount is optional on the geography payload and absent today. */}
                <span>{district.businessCount != null ? `${district.businessCount} ta biznes` : "Biznes: —"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
