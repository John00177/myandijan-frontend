import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MetaTags from "../components/seo/MetaTags";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { useFavorites } from "../hooks/useFavorites";
import { useRequireAuth } from "../hooks/useRequireAuth";
import BusinessListCard from "./search/BusinessListCard";

export default function FavoritesPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { token } = useRequireAuth();
  const { favorites, loading, remove } = useFavorites(lang, token);

  if (!token) return null;

  return (
    <>
      <MetaTags title="Saqlanganlar — My Andijan" description="Siz saqlagan bizneslar." noIndex />

      <div className="max-w-7xl mx-auto px-6 pt-8 pb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">Saqlanganlar</h1>
        {favorites.length > 0 && <Badge tone="blue">{favorites.length} ta</Badge>}
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[260px]" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Siz hali hech narsa saqlamagansiz"
            body="Yoqtirgan bizneslaringizni shu yerda ko'rasiz"
            actionLabel="Qidirishni boshlash"
            onAction={() => navigate(`/${lang}/search`)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {favorites.map((business) => (
              <BusinessListCard
                key={business.id}
                business={business}
                isFavorite
                onToggleFavorite={() => remove(business.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
