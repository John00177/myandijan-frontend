import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategoriesHomepage } from "../../hooks/useCategoriesHomepage";
import { categoryColor, categoryIcon, hexToRgba } from "../../lib/categoryVisuals";
import { localizedName } from "../../lib/localize";
import AnimatedCard from "../../components/AnimatedCard";
import StaggerContainer, { StaggerItem } from "../../components/StaggerContainer";
import Skeleton from "../../components/ui/Skeleton";

export default function CategoriesSection() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { categories, loading } = useCategoriesHomepage(lang);

  const visible = categories.slice(0, 8);

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <h2 className="text-2xl font-bold text-ink mb-8">{t("categories.title")}</h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="size-14 rounded-2xl mx-auto" />
          ))}
        </div>
      ) : (
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {visible.map((category, i) => {
            const Icon = categoryIcon(category.icon);
            const color = categoryColor(category.colorHex, i);
            return (
              <StaggerItem key={category.id}>
                <AnimatedCard
                  onClick={() => navigate(`/${lang}/search?category=${category.slug}`)}
                  className="p-4 flex flex-col items-center text-center gap-3"
                >
                  <div
                    className="size-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: hexToRgba(color, 0.15), color }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink">{localizedName(category, lang)}</div>
                  </div>
                </AnimatedCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </section>
  );
}
