import { Star, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import { getBusinessPremium } from "../../lib/premium";
import { getRestaurantDisplayData } from "../../lib/restaurantMock";
import { isOpenNow } from "../business/OpenNowBadge";
import PremiumBadge, { TopRatedBadge } from "../premium/PremiumBadge";
import type { Business } from "../../types";

interface RestaurantCardProps {
  business: Business;
}

export default function RestaurantCard({ business }: RestaurantCardProps) {
  const { lang, t } = useLanguage();
  const image = business.coverPhoto ?? business.coverImageUrl;
  const { rating, deliveryTime, priceLabel, tags } = getRestaurantDisplayData(business);
  const premium = getBusinessPremium(business);

  const hours = business.primaryBranch?.hours ?? business.branches?.[0]?.hours;
  const open = isOpenNow(hours) ?? business.isOpen ?? true;

  const subtitle = [
    business.category ? localizedName(business.category, lang) : null,
    business.district ? localizedName(business.district, lang) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to={`/${lang}/business/${business.slug}`}
      className={`block bg-[#1e293b] rounded-xl overflow-hidden border transition-colors ${
        premium.plan === "free" ? "border-[#334155] hover:border-primary/40" : "border-gold/35 hover:border-gold/70"
      }`}
    >
      <div className="relative h-32 w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22]">
        {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />}

        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-badge text-[10px] font-bold ${
              open ? "bg-success text-white" : "bg-white/20 text-ink-body"
            }`}
          >
            {open ? t("openNow") : t("closed")}
          </span>
          <span className="px-2 py-0.5 rounded-badge text-[10px] font-bold bg-black/50 text-warning flex items-center gap-0.5">
            <Star size={10} className="fill-warning text-warning" />
            {rating}
          </span>
          {premium.isTopRated && <TopRatedBadge />}
        </div>

        {premium.plan !== "free" && (
          <div className="absolute top-2 right-2">
            <PremiumBadge variant={premium.isFeatured ? "featured" : "premium"} />
          </div>
        )}

        {business.hasDelivery !== false && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-badge text-[10px] font-bold bg-black/60 text-ink flex items-center gap-1">
            <Truck size={10} />
            {deliveryTime}
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-bold text-ink truncate">{localizedName(business, lang)}</h3>

        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="text-xs text-ink-muted truncate">{subtitle}</span>
          <span className="text-xs font-medium text-ink-body shrink-0">💰 {priceLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-badge bg-white/[0.05] text-[10px] text-ink-muted">
              {tag}
            </span>
          ))}
          {/* Paid placement has to be labelled where the listing appears, not
              only in the badge over the photo — the ad label is the disclosure,
              the gold badge is decoration. */}
          {premium.isSponsored && <PremiumBadge variant="sponsor" className="ml-auto" />}
        </div>
      </div>
    </Link>
  );
}
