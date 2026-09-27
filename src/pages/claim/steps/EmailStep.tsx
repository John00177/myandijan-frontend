import { Lock } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import StepShell, { FIELD_CLASSES } from "../StepShell";

interface EmailStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailStep({ value, onChange, onNext, onBack }: EmailStepProps) {
  const { t } = useLanguage();
  const trimmed = value.trim();
  const valid = EMAIL_PATTERN.test(trimmed);

  return (
    <StepShell
      heading={t("claim.emailTitle")}
      subheading={t("claim.emailSubtitle")}
      onSubmit={onNext}
      onBack={onBack}
      canContinue={valid}
      error={trimmed.length > 0 && !valid ? t("claim.errorEmailInvalid") : null}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="biznes@example.com"
        aria-label={t("claim.emailTitle")}
        autoFocus
        className={FIELD_CLASSES}
      />

      {/* The reassurance sits directly under the field, where the hesitation
          actually happens, rather than in a footnote nobody reads. */}
      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-muted">
        <Lock size={12} />
        {t("claim.emailPrivate")}
      </p>
    </StepShell>
  );
}
