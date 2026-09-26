import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import OtpInput from "../../components/auth/OtpInput";
import { useLanguage } from "../../contexts/LanguageContext";
import { OTP_LENGTH } from "../../hooks/useSignup";

interface OtpScreenProps {
  phoneDisplay: string;
  submitting: boolean;
  error: string | null;
  resendIn: number;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  onClearError: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function OtpScreen({
  phoneDisplay,
  submitting,
  error,
  resendIn,
  onSubmit,
  onResend,
  onBack,
  onClearError,
}: OtpScreenProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");

  const complete = code.replace(/\D/g, "").length === OTP_LENGTH;

  // Submit as soon as the last digit lands. Autofill and paste both deliver a
  // full code at once, and making the user then reach for a button is the
  // slowest part of an otherwise instant step.
  useEffect(() => {
    if (complete && !submitting && !error) onSubmit(code);
    // onSubmit identity changes per render in the parent; depending on it here
    // would re-fire the submit on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, code]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!complete || submitting) return;
    onSubmit(code);
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} />
        {t("signup.back")}
      </button>

      <h1 className="mt-5 text-2xl font-bold text-ink sm:text-3xl">{t("signup.otpTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {t("signup.otpSubtitle").replace("{phone}", phoneDisplay)}
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col">
        <OtpInput
          value={code}
          onChange={(next) => {
            if (error) onClearError();
            setCode(next);
          }}
          length={OTP_LENGTH}
          error={!!error}
          autoFocus
        />

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="mt-5 text-center text-sm">
          {resendIn > 0 ? (
            <span className="text-ink-muted">
              {t("signup.resendIn").replace("{time}", formatCountdown(resendIn))}
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              className="font-semibold text-primary transition-colors hover:text-blue-300"
            >
              {t("signup.resend")}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!complete || submitting}
          className="mt-6 h-14 w-full rounded-full bg-primary text-lg font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? t("common.loading") : t("signup.verify")}
        </button>
      </form>
    </div>
  );
}
