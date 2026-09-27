import { useLanguage } from "../../../contexts/LanguageContext";
import StepShell, { FIELD_CLASSES } from "../StepShell";

interface WebsiteStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function WebsiteStep({ value, onChange, onNext, onBack, onSkip }: WebsiteStepProps) {
  const { t } = useLanguage();

  return (
    <StepShell
      heading={t("claim.websiteTitle")}
      subheading={t("claim.websiteSubtitle")}
      onSubmit={onNext}
      onBack={onBack}
      // Genuinely optional, and the only step that is — so it is the only one
      // that offers Skip. An empty value continues just as happily.
      onSkip={onSkip}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://example.uz"
        aria-label={t("claim.websiteLabel")}
        autoFocus
        className={FIELD_CLASSES}
      />
      <p className="mt-2.5 text-xs text-ink-muted">{t("claim.websiteHelper")}</p>
    </StepShell>
  );
}
