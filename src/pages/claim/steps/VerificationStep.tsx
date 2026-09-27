import { Check, MessageSquare, Phone } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { toE164 } from "../../../lib/phone";
import StepShell from "../StepShell";
import type { VerificationMethod } from "../../../hooks/useClaimFlow";

interface VerificationStepProps {
  value: VerificationMethod;
  phone: string;
  onChange: (value: VerificationMethod) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Choice of how the business phone gets verified.
 *
 * Neither method is performed here. There is no business-phone verification
 * endpoint on the API: /auth/otp/* verifies a PERSON's phone and issues a
 * session for it, so pointing it at a business number would sign the claimant
 * in as that number rather than prove they answer it. A new listing already
 * lands in PENDING for admin review, so this records the owner's preferred
 * contact method for that review instead of pretending to verify.
 */
export default function VerificationStep({ value, phone, onChange, onNext, onBack }: VerificationStepProps) {
  const { t } = useLanguage();

  const options: { id: VerificationMethod; icon: typeof Phone; label: string; description: string }[] = [
    {
      id: "sms",
      icon: MessageSquare,
      label: t("claim.verifySms"),
      description: t("claim.verifySmsDesc"),
    },
    {
      id: "call",
      icon: Phone,
      label: t("claim.verifyCall"),
      description: t("claim.verifyCallDesc"),
    },
  ];

  return (
    <StepShell
      heading={t("claim.verifyTitle")}
      subheading={t("claim.verifySubtitle").replace("{phone}", toE164(phone, { pretty: true }))}
      onSubmit={onNext}
      onBack={onBack}
    >
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const selected = option.id === value;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`flex items-center gap-3.5 rounded-xl border-2 p-4 text-left transition-colors ${
                selected
                  ? "border-primary bg-primary/[0.10]"
                  : "border-white/[0.10] bg-elevated hover:border-white/25"
              }`}
            >
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-ink-muted"
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="block text-xs text-ink-muted">{option.description}</span>
              </span>
              {selected && <Check size={18} className="shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-ink-muted">{t("claim.verifyNote")}</p>
    </StepShell>
  );
}
