import { MapPin } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useRegions } from "../../hooks/useRegions";
import { localizedName } from "../../lib/localize";
import AnimatedCard from "../../components/AnimatedCard";
import StaggerContainer, { StaggerItem } from "../../components/StaggerContainer";
import Badge from "../../components/ui/Badge";
import Skeleton from "../../components/ui/Skeleton";

const CENTER_DISTRICT_SLUG = "andijon-tumani";

export default function DistrictsSection() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { regions, loading } = useRegions(lang);

  const districts = regions[0]?.districts.slice(0, 6) ?? [];

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-ink">{t("districts.title")}</h2>
        <Link to={`/${lang}/search`} className="text-sm text-primary hover:text-blue-300 transition-colors">
          {t("districts.seeAll")} →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {districts.map((district) => {
            const isCenter = district.slug === CENTER_DISTRICT_SLUG;
            return (
              <StaggerItem key={district.id}>
                <AnimatedCard
                  onClick={() => navigate(`/${lang}/district/${district.slug}`)}
                  className={`p-5 flex items-center justify-between ${
                    isCenter ? "border-primary/30 bg-primary/[0.05]" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-ink">{localizedName(district, lang)}</span>
                      {isCenter && <Badge tone="blue">{t("districts.center")}</Badge>}
                    </div>
                    <div className="text-sm text-ink-muted mt-1">{t("districts.viewBusinesses")}</div>
                  </div>
                  <MapPin size={16} className="text-ink-muted" />
                </AnimatedCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </section>
  );
}
