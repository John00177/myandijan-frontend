import { Search } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useSearchBusinesses } from "../../../hooks/useSearchBusinesses";
import { localizedName } from "../../../lib/localize";
import StepShell from "../StepShell";

interface NameStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

const inputClasses =
  "h-14 w-full rounded-xl border-2 border-white/[0.10] bg-elevated px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary/20";

/**
 * Typeahead against businesses already on the platform.
 *
 * Matching an existing listing matters: a duplicate page splits a business's
 * reviews across two entries and neither looks credible. Showing matches as
 * the owner types is the cheapest moment to catch that.
 */
export default function NameStep({ value, onChange, onNext }: NameStepProps) {
  const { lang, t } = useLanguage();
  const debounced = useDebouncedValue(value.trim(), 300);

  const { businesses, loading } = useSearchBusinesses({
    search: debounced.length >= 2 ? debounced : undefined,
    page: 1,
    limit: 5,
    lang,
  });

  const matches = debounced.length >= 2 ? businesses : [];

  return (
    <StepShell heading={t("claim.nameTitle")} subheading={t("claim.nameSubtitle")} onSubmit={onNext} canContinue={value.trim().length >= 2}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("claim.namePlaceholder")}
          aria-label={t("claim.nameTitle")}
          autoFocus
          className={`${inputClasses} pl-11`}
        />
      </div>

      {matches.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-elevated">
          <p className="border-b border-white/[0.06] px-4 py-2 text-xs text-ink-muted">
            {t("claim.existingMatches")}
          </p>
          {matches.map((business) => (
            <button
              key={business.id}
              type="button"
              onClick={() => onChange(localizedName(business, lang))}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <span className="truncate text-sm text-ink">{localizedName(business, lang)}</span>
              {business.district && (
                <span className="shrink-0 text-xs text-ink-muted">{localizedName(business.district, lang)}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!loading && debounced.length >= 2 && matches.length === 0 && (
        <p className="mt-3 text-sm text-ink-muted">
          {t("claim.noMatches").replace("{name}", debounced)}
        </p>
      )}
    </StepShell>
  );
}
