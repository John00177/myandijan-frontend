import { useLanguage } from "../../contexts/LanguageContext";
import { CUISINE_SLUGS, type CuisineSlug } from "../../lib/restaurantMock";
import type { TranslationKey } from "../../i18n";

const CUISINE_LABEL_KEYS: Record<CuisineSlug, TranslationKey> = {
  milliy: "national",
  "fast-food": "fastFood",
  yapon: "japanese",
  italiyan: "italian",
  koreys: "korean",
  kafe: "cafe",
};

interface CuisineChipsProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CuisineChips({ value, onChange }: CuisineChipsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      <button
        onClick={() => onChange("")}
        className={`shrink-0 h-8 px-3 rounded-badge text-sm font-medium ${
          value === "" ? "bg-blue-600 text-white" : "bg-[#334155] text-ink-body hover:bg-[#3f4f66]"
        }`}
      >
        {t("cuisineAll")}
      </button>
      {CUISINE_SLUGS.map((slug) => (
        <button
          key={slug}
          onClick={() => onChange(slug)}
          className={`shrink-0 h-8 px-3 rounded-badge text-sm font-medium ${
            value === slug ? "bg-blue-600 text-white" : "bg-[#334155] text-ink-body hover:bg-[#3f4f66]"
          }`}
        >
          {t(CUISINE_LABEL_KEYS[slug])}
        </button>
      ))}
    </div>
  );
}
