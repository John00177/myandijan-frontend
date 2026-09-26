import { Lock, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatNational, isValidUzPhone, digitsOf } from "../../lib/phone";

interface PhoneScreenProps {
  submitting: boolean;
  error: string | null;
  onSubmit: (phone: string) => void;
  onClearError: () => void;
  /** Neither provider is wired on the backend yet — see SignupPage. */
  onSocial: (provider: "telegram" | "google") => void;
  socialNotice: string | null;
}

/** Google's mark, inlined — lucide has no brand icons and this avoids a dependency. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export default function PhoneScreen({
  submitting,
  error,
  onSubmit,
  onClearError,
  onSocial,
  socialNotice,
}: PhoneScreenProps) {
  const { lang, t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = isValidUzPhone(phone);
  const showInvalid = touched && phone.length > 0 && !valid;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid || submitting) return;
    onSubmit(phone);
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t("signup.welcomeTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("signup.welcomeSubtitle")}</p>

      {/* Social first, form second — the pattern that makes the fast path the
          visible one. Both providers are backend-gated for now. */}
      <div className="mt-7 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => onSocial("telegram")}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#2AABEE] text-lg font-semibold text-white transition-[filter] hover:brightness-105"
        >
          <Send size={18} />
          {t("signup.continueTelegram")}
        </button>
        <button
          type="button"
          onClick={() => onSocial("google")}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-full border-2 border-white/[0.12] bg-white text-lg font-semibold text-[#1F1F1F] transition-colors hover:bg-white/90"
        >
          <GoogleMark />
          {t("signup.continueGoogle")}
        </button>
      </div>

      {socialNotice && (
        <p role="status" className="mt-3 text-center text-sm text-warning">
          {socialNotice}
        </p>
      )}

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/[0.10]" />
        <span className="text-xs uppercase tracking-wider text-ink-muted">{t("signup.or")}</span>
        <span className="h-px flex-1 bg-white/[0.10]" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col">
        <label htmlFor="signup-phone" className="text-sm font-medium text-ink-body">
          {t("signup.phoneLabel")}
        </label>

        <div
          className={`mt-2 flex h-14 items-center rounded-xl border-2 bg-elevated pr-4 transition-colors focus-within:ring-4 ${
            showInvalid
              ? "border-red-500 focus-within:ring-red-500/20"
              : "border-white/[0.10] focus-within:border-primary focus-within:ring-primary/20"
          }`}
        >
          <span className="flex shrink-0 select-none items-center gap-1.5 pl-4 pr-2 text-base text-ink-body">
            <span aria-hidden="true">🇺🇿</span> +998
          </span>
          <input
            id="signup-phone"
            value={formatNational(phone)}
            onChange={(e) => {
              onClearError();
              setPhone(digitsOf(e.target.value));
            }}
            onBlur={() => setTouched(true)}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="90 123 45 67"
            aria-invalid={showInvalid || undefined}
            aria-describedby="signup-phone-help"
            /* text-base (16px) — anything smaller makes iOS Safari zoom the
               viewport on focus and the layout never zooms back out. */
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted"
          />
        </div>

        <p id="signup-phone-help" className="mt-2 text-xs text-ink-muted">
          {t("signup.phoneHelper")}
        </p>

        {showInvalid && <p className="mt-1.5 text-sm text-red-500">{t("signup.errorPhoneInvalid")}</p>}
        {error && (
          <p role="alert" className="mt-1.5 text-sm text-red-500">
            {error}
          </p>
        )}

        <p className="mt-5 text-center text-xs leading-relaxed text-ink-muted">{t("signup.legal")}</p>

        <button
          type="submit"
          disabled={submitting}
          className="mt-3 h-14 w-full rounded-full bg-primary text-lg font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? t("common.loading") : t("signup.continue")}
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
          <Lock size={12} />
          {t("signup.trustBadge")}
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {t("signup.haveAccount")}{" "}
        <Link to={`/${lang}`} className="font-semibold text-primary hover:text-blue-300">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
