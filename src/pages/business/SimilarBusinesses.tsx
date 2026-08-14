import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedCard from "../../components/AnimatedCard";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import type { Business } from "../../types";

interface SimilarBusinessesProps {
  businesses: Business[] | undefined;
}

export default function SimilarBusinesses({ businesses }: SimilarBusinessesProps) {
  const { lang } = useLanguage();

  if (!businesses || businesses.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-ink mb-4">O'xshash bizneslar</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {businesses.map((business) => (
          <Link key={business.id} to={`/${lang}/business/${business.slug}`} className="shrink-0 w-64">
            <AnimatedCard className="overflow-hidden">
              <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22] relative">
                {business.coverImageUrl && (
                  <img src={business.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <div className="font-medium text-ink truncate">{localizedName(business, lang)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="fill-warning text-warning" />
                  <span className="text-xs text-warning font-semibold">{business.rating ?? "—"}</span>
                </div>
              </div>
            </AnimatedCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
