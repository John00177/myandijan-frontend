import { ChevronDown } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export type RestaurantSort = "rating" | "price" | "new" | "nearest";

const SORT_OPTIONS: { value: RestaurantSort; label: string }[] = [
  { value: "rating", label: "Reyting (yuqori)" },
  { value: "price", label: "Narx (arzon)" },
  { value: "new", label: "Yangi" },
  { value: "nearest", label: "Eng yaqin" },
];

interface SortDropdownProps {
  value: RestaurantSort;
  onChange: (value: RestaurantSort) => void;
}

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useLanguage();
  const activeLabel = SORT_OPTIONS.find((o) => o.value === value)?.label ?? t("sortBy");

  return (
    <div className="relative shrink-0 h-8 px-3 rounded-badge text-sm font-medium flex items-center gap-1.5 cursor-pointer bg-[#334155] text-ink-body hover:bg-[#3f4f66]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RestaurantSort)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none whitespace-nowrap">{activeLabel}</span>
      <ChevronDown size={14} className="pointer-events-none shrink-0" />
    </div>
  );
}
