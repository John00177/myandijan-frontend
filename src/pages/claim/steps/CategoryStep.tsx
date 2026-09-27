import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useCategories } from "../../../hooks/useCategories";
import { localizedName } from "../../../lib/localize";
import StepShell, { FIELD_CLASSES } from "../StepShell";

interface CategoryStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Searchable category picker.
 *
 * A filterable list rather than a <select>: the category list is long enough
 * that scanning a native dropdown on a phone is slower than typing two
 * letters, and the owner usually knows the word they are looking for.
 */
export default function CategoryStep({ value, onChange, onNext, onBack }: CategoryStepProps) {
  const { lang, t } = useLanguage();
  const { categories, loading } = useCategories(lang);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => localizedName(c, lang).toLowerCase().includes(q));
  }, [categories, query, lang]);

  return (
    <StepShell
      heading={t("claim.categoryTitle")}
      subheading={t("claim.categorySubtitle")}
      onSubmit={onNext}
      onBack={onBack}
      canContinue={!!value}
    >
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("claim.categorySearchPlaceholder")}
          aria-label={t("claim.categorySearchPlaceholder")}
          className={`${FIELD_CLASSES} pl-11`}
        />
      </div>

      <div className="mt-3 max-h-[280px] overflow-y-auto rounded-xl border border-white/[0.08]">
        {loading ? (
          <p className="px-4 py-3 text-sm text-ink-muted">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-3 text-sm text-ink-muted">{t("claim.categoryNoResults")}</p>
        ) : (
          filtered.map((category) => {
            const selected = String(category.id) === value;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onChange(String(category.id))}
                aria-pressed={selected}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                  selected ? "bg-primary/[0.12] text-ink" : "text-ink-body hover:bg-white/[0.04]"
                }`}
              >
                <span className="truncate text-sm">{localizedName(category, lang)}</span>
                {selected && <Check size={16} className="shrink-0 text-primary" />}
              </button>
            );
          })
        )}
      </div>

      <p className="mt-2.5 text-xs text-ink-muted">{t("claim.categoryHelper")}</p>
    </StepShell>
  );
}
