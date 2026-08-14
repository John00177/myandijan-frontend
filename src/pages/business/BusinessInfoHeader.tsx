import { Star } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import type { Business } from "../../types";

interface BusinessInfoHeaderProps {
  business: Business;
}

export default function BusinessInfoHeader({ business }: BusinessInfoHeaderProps) {
  const { lang } = useLanguage();

  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">{localizedName(business, lang)}</h1>

      <div className="flex gap-2 mt-2">
        {business.category && <Badge tone="cyan">{localizedName(business.category, lang)}</Badge>}
        {business.verified && <Badge tone="blue">Tasdiqlangan</Badge>}
        <Badge tone={business.isOpen ? "success" : "danger"}>{business.isOpen ? "Ochiq" : "Yopiq"}</Badge>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Star size={18} className="fill-warning text-warning" />
        <span className="text-xl font-bold text-warning">{business.rating ?? "—"}</span>
        <a href="#reviews" className="text-sm text-ink-muted hover:text-primary">
          {business.reviewCount ?? 0} sharh
        </a>
      </div>
    </div>
  );
}
