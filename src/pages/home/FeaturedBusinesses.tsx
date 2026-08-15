import { Heart, MapPin, Phone, Star, Store } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFeaturedBusinesses } from "../../hooks/useFeaturedBusinesses";
import { localizedName } from "../../lib/localize";
import AnimatedCard from "../../components/AnimatedCard";
import StaggerContainer, { StaggerItem } from "../../components/StaggerContainer";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";

const GRID_CLASSES = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";

export default function FeaturedBusinesses() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { businesses, loading } = useFeaturedBusinesses(lang);

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="uppercase tracking-widest text-[10px] text-ink-muted mb-1">{t("featured.eyebrow")}</div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">{t("featured.title")}</h2>
        </div>
        <Link
          to={`/${lang}/search`}
          className="text-sm text-primary hover:text-blue-300 transition-colors duration-200"
        >
          {t("featured.seeAll")} →
        </Link>
      </div>

      {loading ? (
        <div className={GRID_CLASSES}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[260px]" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Hozircha tavsiya etilgan bizneslar yo'q"
          body="Bizneslar qo'shilgach, shu yerda ko'rinadi."
          actionLabel="Birinchi bo'lib qo'shing"
          onAction={() => navigate(`/${lang}/dashboard/business/new`)}
        />
      ) : (
        <StaggerContainer className={GRID_CLASSES}>
          {businesses.map((business) => (
            <StaggerItem key={business.id}>
              <AnimatedCard
                onClick={() => navigate(`/${lang}/business/${business.slug}`)}
                className="overflow-hidden"
              >
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22] relative overflow-hidden">
                  {business.coverImageUrl && (
                    <img
                      src={business.coverImageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-base/90 via-transparent to-transparent" />
                  {business.category && (
                    <Badge tone="blue" className="absolute top-3 left-3">
                      {localizedName(business.category, lang)}
                    </Badge>
                  )}
                  <button
                    aria-label={t("common.favorite")}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 right-3 size-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60"
                  >
                    <Heart size={16} />
                  </button>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-ink line-clamp-1">{localizedName(business, lang)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Star size={14} className="fill-warning text-warning" />
                    <span className="text-sm font-semibold text-warning">{business.rating ?? "—"}</span>
                    <span className="text-xs text-ink-muted">({business.reviewCount ?? 0})</span>
                  </div>
                  {business.district && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-ink-muted">
                      <MapPin size={12} />
                      {localizedName(business.district, lang)}
                    </div>
                  )}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 w-full h-9 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 flex items-center justify-center gap-2"
                  >
                    <Phone size={14} />
                    {t("common.call")}
                  </button>
                </div>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </section>
  );
}
