import { ArrowLeft } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

/** Shared field styling: 16px text so iOS Safari doesn't zoom the viewport on focus. */
export const FIELD_CLASSES =
  "h-14 w-full rounded-xl border-2 border-white/[0.10] bg-elevated px-4 text-base text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-primary focus:ring-4 focus:ring-primary/20";

interface StepShellProps {
  heading: string;
  subheading?: string;
  children: ReactNode;
  onSubmit: () => void;
  onBack?: () => void;
  /** Renders a Skip control next to the primary CTA for genuinely optional steps. */
  onSkip?: () => void;
  canContinue?: boolean;
  submitting?: boolean;
  continueLabel?: string;
  error?: string | null;
}

/**
 * Shared frame for every claim step: back link, heading, one field, one CTA.
 *
 * There is deliberately no progress indicator — no bar, no "3 of 8". Telling
 * an owner at the first screen how many screens remain is handing them a
 * reason to stop before starting, which is the single most expensive thing
 * this flow could do.
 */
export default function StepShell({
  heading,
  subheading,
  children,
  onSubmit,
  onBack,
  onSkip,
  canContinue = true,
  submitting = false,
  continueLabel,
  error,
}: StepShellProps) {
  const { t } = useLanguage();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canContinue || submitting) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 mb-5 flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} />
          {t("signup.back")}
        </button>
      )}

      <h1 className="text-2xl font-bold text-ink sm:text-3xl">{heading}</h1>
      {subheading && <p className="mt-2 text-sm text-ink-muted">{subheading}</p>}

      <div className="mt-6">{children}</div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="mt-7 flex items-center gap-3">
        <button
          type="submit"
          disabled={!canContinue || submitting}
          className="h-14 flex-1 rounded-full bg-primary text-lg font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? t("common.loading") : (continueLabel ?? t("signup.continue"))}
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="h-14 shrink-0 rounded-full px-5 text-base font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t("claim.skip")}
          </button>
        )}
      </div>
    </form>
  );
}
