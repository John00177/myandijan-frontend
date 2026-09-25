import { Crown } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { PRICE_BUCKETS } from "../../lib/restaurantMock";

interface FilterPillsProps {
  price: string;
  onPriceChange: (value: string) => void;
  deliveryOnly: boolean;
  onDeliveryToggle: () => void;
  ratingOnly: boolean;
  onRatingToggle: () => void;
  openNowOnly: boolean;
  onOpenNowToggle: () => void;
  premiumOnly: boolean;
  onPremiumToggle: () => void;
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-8 px-3 rounded-badge text-sm font-medium flex items-center gap-1.5 ${
        active ? "bg-blue-600 text-white" : "bg-[#334155] text-ink-body hover:bg-[#3f4f66]"
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterPills({
  price,
  onPriceChange,
  deliveryOnly,
  onDeliveryToggle,
  ratingOnly,
  onRatingToggle,
  openNowOnly,
  onOpenNowToggle,
  premiumOnly,
  onPremiumToggle,
}: FilterPillsProps) {
  const { t } = useLanguage();
  const activePriceLabel = price ? PRICE_BUCKETS[Number(price)]?.label : null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      <div
        className={`relative shrink-0 h-8 px-3 rounded-badge text-sm font-medium flex items-center gap-1.5 cursor-pointer ${
          price ? "bg-blue-600 text-white" : "bg-[#334155] text-ink-body hover:bg-[#3f4f66]"
        }`}
      >
        <select
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        >
          <option value="">{t("priceRange")}</option>
          {PRICE_BUCKETS.map((bucket, i) => (
            <option key={bucket.label} value={i}>
              {bucket.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none whitespace-nowrap">💰 {activePriceLabel ?? t("priceRange")}</span>
      </div>

      <Toggle active={deliveryOnly} onClick={onDeliveryToggle}>
        🚚 {t("deliveryFilter")}
      </Toggle>
      <Toggle active={ratingOnly} onClick={onRatingToggle}>
        ⭐ 4.5+
      </Toggle>
      <Toggle active={openNowOnly} onClick={onOpenNowToggle}>
        🕐 {t("openNowFilter")}
      </Toggle>

      {/* Gold rather than the shared blue active state — this filter selects
          paid listings, and it should read as the same thing the gold badges
          on those cards mean. */}
      <button
        onClick={onPremiumToggle}
        aria-pressed={premiumOnly}
        className={`shrink-0 h-8 px-3 rounded-badge text-sm font-medium flex items-center gap-1.5 ${
          premiumOnly
            ? "bg-gradient-to-r from-gold to-[#FFB300] text-[#3A2B00]"
            : "bg-[#334155] text-ink-body hover:bg-[#3f4f66]"
        }`}
      >
        <Crown size={13} />
        {t("premiumOnly")}
      </button>
    </div>
  );
}
