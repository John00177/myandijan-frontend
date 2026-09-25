import { Briefcase, Heart, MapPin, Navigation, Phone, Star, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedCard from "../../components/AnimatedCard";
import Badge from "../../components/ui/Badge";
import OpenNowBadge from "../../components/business/OpenNowBadge";
import PremiumBadge, { TopRatedBadge } from "../../components/premium/PremiumBadge";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import { getBusinessPremium } from "../../lib/premium";
import type { Business } from "../../types";

interface BusinessListCardProps {
  business: Business;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function BusinessListCard({ business, isFavorite = false, onToggleFavorite }: BusinessListCardProps) {
  const { lang } = useLanguage();
  const image = business.coverPhoto ?? business.coverImageUrl;
  const premium = getBusinessPremium(business);

  return (
    <AnimatedCard className="p-4 flex gap-4">
      <Link
        to={`/${lang}/business/${business.slug}`}
        className="w-32 h-24 rounded-xl bg-gradient-to-br from-[#1F2C38] to-[#121A22] shrink-0 relative overflow-hidden flex items-center justify-center"
      >
        {image ? (
          <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <Briefcase size={24} className="text-ink-muted/40" />
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link to={`/${lang}/business/${business.slug}`} className="text-lg font-semibold text-ink truncate">
            {localizedName(business, lang)}
          </Link>
          {business.verified && <PremiumBadge variant="verified" />}
          {premium.plan !== "free" && <PremiumBadge variant={premium.isFeatured ? "featured" : "premium"} />}
          {premium.isTopRated && <TopRatedBadge />}
          {(business.isPromoted || premium.isSponsored) && <PremiumBadge variant="sponsor" />}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Star size={14} className="fill-warning text-warning" />
          <span className="text-sm font-semibold text-warning">{business.rating ?? "—"}</span>
          <span className="text-xs text-ink-muted">({business.reviewCount ?? 0})</span>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {business.category && <Badge tone="cyan">{localizedName(business.category, lang)}</Badge>}
          {business.hasDelivery && (
            <Badge tone="purple">
              <Truck size={11} /> Yetkazib berish
            </Badge>
          )}
          {business.district && (
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <MapPin size={12} />
              {localizedName(business.district, lang)}
            </span>
          )}
          <OpenNowBadge hours={business.primaryBranch?.hours ?? business.branches?.[0]?.hours} compact />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <a
            href={business.phone ? `tel:${business.phone}` : undefined}
            className="h-8 px-3 rounded-btn bg-primary/10 text-primary text-sm font-medium flex items-center gap-1.5 hover:bg-primary/20"
          >
            <Phone size={14} />
            Qo'ng'iroq
          </a>
          <button className="h-8 px-3 rounded-btn text-ink-muted text-sm font-medium flex items-center gap-1.5 hover:text-ink hover:bg-card">
            <Navigation size={14} />
            Yo'nalish
          </button>
          <button
            aria-label={isFavorite ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
            onClick={onToggleFavorite}
            className={`size-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] flex items-center justify-center active:scale-[0.95] ${
              isFavorite ? "text-danger" : "text-ink-muted hover:text-danger"
            }`}
          >
            <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </AnimatedCard>
  );
}
