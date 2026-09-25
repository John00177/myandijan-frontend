import { Star, Truck } from "lucide-react";
import Badge from "../../components/ui/Badge";
import OpenNowBadge from "../../components/business/OpenNowBadge";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import type { Business } from "../../types";

interface BusinessInfoHeaderProps {
  business: Business;
  /** Reviews now live in a tab, not a page anchor — this switches to it instead of scrolling to a hidden section. */
  onViewReviews?: () => void;
}

export default function BusinessInfoHeader({ business, onViewReviews }: BusinessInfoHeaderProps) {
  const { lang, t } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">{localizedName(business, lang)}</h1>

      <div className="flex gap-2 mt-2 flex-wrap">
        {business.category && <Badge tone="cyan">{localizedName(business.category, lang)}</Badge>}
        {business.verified && <Badge tone="blue">{t("verified")}</Badge>}
        <OpenNowBadge hours={business.primaryBranch?.hours ?? business.branches?.[0]?.hours} />
        {business.hasDelivery && (
          <Badge tone="purple">
            <Truck size={11} /> {t("deliveryAvailable")}
          </Badge>
        )}
      </div>
      {business.hasDelivery && (business.deliveryFee != null || business.deliveryTime) && (
        <p className="text-xs text-ink-muted mt-1.5">
          {business.deliveryFee != null && `${t("priceLabel")} ${business.deliveryFee.toLocaleString()} so'm`}
          {business.deliveryFee != null && business.deliveryTime && " · "}
          {business.deliveryTime && `${t("timeLabel")} ${business.deliveryTime}`}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3">
        <Star size={18} className="fill-warning text-warning" />
        <span className="text-xl font-bold text-warning">{business.rating ?? "—"}</span>
        <button type="button" onClick={onViewReviews} className="text-sm text-ink-muted hover:text-primary">
          {business.reviewCount ?? 0} {t("reviewsShort")}
        </button>
      </div>
    </div>
  );
}
