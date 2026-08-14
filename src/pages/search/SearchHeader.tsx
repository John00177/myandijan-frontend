import { Search } from "lucide-react";
import type { FormEvent } from "react";
import type { Category, District, City } from "../../types";
import { localizedName } from "../../lib/localize";
import type { Lang } from "../../types";
import FilterSelect from "./FilterSelect";

export type SortOption = "default" | "rating" | "name";

interface SearchHeaderProps {
  lang: Lang;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  categories: Category[];
  categoryValue: string;
  onCategoryChange: (value: string) => void;
  districts: District[];
  districtValue: string;
  onDistrictChange: (value: string) => void;
  cities: City[];
  cityValue: string;
  onCityChange: (value: string) => void;
  sortValue: SortOption;
  onSortChange: (value: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating", label: "Reyting bo'yicha" },
  { value: "name", label: "Nomi bo'yicha" },
];

export default function SearchHeader({
  lang,
  query,
  onQueryChange,
  onSubmit,
  categories,
  categoryValue,
  onCategoryChange,
  districts,
  districtValue,
  onDistrictChange,
  cities,
  cityValue,
  onCityChange,
  sortValue,
  onSortChange,
}: SearchHeaderProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    // Height was fixed at h-20 (80px) but the form (48px) + gap + filter row (32px)
    // need ~92px+, so the filter chips overflowed past the border-b and visually
    // collided with it. Sizing to content via padding instead of a fixed height
    // fixes that at any content size, rather than just raising the number.
    <div className="sticky top-16 z-40 bg-surface/95 backdrop-blur-xl border-b border-white/[0.06] pt-4 pb-4">
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto h-12 bg-elevated border border-white/[0.10] rounded-xl flex items-center px-4 gap-3">
          <Search size={18} className="text-ink-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Restoran, do'kon, xizmat..."
            className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-muted outline-none"
          />
          <button type="submit" className="h-9 px-5 bg-primary text-white font-medium rounded-lg shrink-0">
            Qidirish
          </button>
        </form>

        <div className="relative z-0 flex gap-2 mt-4 justify-center flex-wrap">
          <FilterSelect
            value={categoryValue}
            onChange={onCategoryChange}
            allLabel="Barcha turkumlar"
            options={categories.map((c) => ({ value: c.slug, label: localizedName(c, lang) }))}
          />
          <FilterSelect
            value={districtValue}
            onChange={onDistrictChange}
            allLabel="Barcha tumanlar"
            options={districts.map((d) => ({ value: String(d.id), label: localizedName(d, lang) }))}
          />
          <FilterSelect
            value={cityValue}
            onChange={onCityChange}
            allLabel="Barcha shaharlar"
            options={cities.map((c) => ({ value: String(c.id), label: localizedName(c, lang) }))}
          />
          <FilterSelect
            value={sortValue === "default" ? "" : sortValue}
            onChange={(v) => onSortChange((v as SortOption) || "default")}
            allLabel="Saralash"
            options={SORT_OPTIONS}
          />
        </div>
      </div>
    </div>
  );
}
