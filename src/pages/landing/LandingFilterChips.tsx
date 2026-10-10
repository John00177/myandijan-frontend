export interface LandingFilterOption {
  value: string;
  label: string;
}

interface LandingFilterChipsProps {
  /** Group label, e.g. "By district". */
  label: string;
  allLabel: string;
  options: LandingFilterOption[];
  /** "" = no filter. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * One-row chip filter for the category and district landing pages. The
 * selection lives in the query string, which MetaTags leaves out of the
 * canonical — a filtered view always canonicalizes to the landing page itself,
 * so these combinations never become separately indexed duplicates.
 */
export default function LandingFilterChips({ label, allLabel, options, value, onChange }: LandingFilterChipsProps) {
  if (options.length === 0) return null;

  const chip = (optionValue: string, optionLabel: string) => {
    const active = optionValue === value;
    return (
      <button
        key={optionValue || "all"}
        type="button"
        aria-pressed={active}
        onClick={() => onChange(optionValue)}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
          active
            ? "border-primary bg-primary/15 text-ink"
            : "border-white/[0.08] text-ink-muted hover:text-ink hover:border-white/20"
        }`}
      >
        {optionLabel}
      </button>
    );
  };

  return (
    <div role="group" aria-label={label} className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-2">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        {chip("", allLabel)}
        {options.map((option) => chip(option.value, option.label))}
      </div>
    </div>
  );
}
