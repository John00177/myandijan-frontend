import { useLanguage } from "../../../contexts/LanguageContext";
import { digitsOf, formatNational, isValidUzPhone } from "../../../lib/phone";
import StepShell from "../StepShell";

interface PhoneStepProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function PhoneStep({ value, onChange, onNext, onBack }: PhoneStepProps) {
  const { t } = useLanguage();
  const valid = isValidUzPhone(value);

  return (
    <StepShell
      heading={t("claim.phoneTitle")}
      subheading={t("claim.phoneSubtitle")}
      onSubmit={onNext}
      onBack={onBack}
      canContinue={valid}
      error={value.length > 0 && !valid ? t("signup.errorPhoneInvalid") : null}
    >
      <div className="flex h-14 items-center rounded-xl border-2 border-white/[0.10] bg-elevated pr-4 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20">
        <span className="flex shrink-0 select-none items-center gap-1.5 pl-4 pr-2 text-base text-ink-body">
          <span aria-hidden="true">🇺🇿</span> +998
        </span>
        <input
          value={formatNational(value)}
          onChange={(e) => onChange(digitsOf(e.target.value))}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="90 123 45 67"
          aria-label={t("claim.phoneTitle")}
          autoFocus
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
        />
      </div>

      <p className="mt-2.5 text-xs text-ink-muted">{t("claim.phoneHelper")}</p>
    </StepShell>
  );
}
