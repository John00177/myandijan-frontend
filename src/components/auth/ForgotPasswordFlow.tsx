import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ApiError, forgotPassword, resetPassword, verifyResetCode } from "../../lib/api";
import Button from "../ui/Button";
import OtpInput from "./OtpInput";

type Step = "phone" | "otp" | "newPassword" | "success";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;
/** Matches the live API's real register-endpoint constraint, not the 6-char minimum floated in the ticket. */
const MIN_PASSWORD_LENGTH = 8;

const inputClasses =
  "h-12 w-full bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

interface ForgotPasswordFlowProps {
  onBackToLogin: () => void;
}

/**
 * Phone → OTP → new password, as a step machine rather than tabs (this isn't
 * reachable as its own tab — only via "Forgot password?" on the login step).
 *
 * None of the three backend endpoints exist yet (confirmed 404 on all three,
 * 2026-08-13). Every request here treats a 404 as "not launched" rather than
 * a real failure and surfaces a dismissible notice instead of a scary error,
 * so the flow is ready to go live the moment the backend ships it.
 */
export default function ForgotPasswordFlow({ onBackToLogin }: ForgotPasswordFlowProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  function reportError(err: unknown, onNotLaunched: () => void) {
    if (err instanceof ApiError && err.status === 404) {
      setNotice(t("auth.resetPassword.comingSoon"));
      onNotLaunched();
      return;
    }
    setErrorMessage(err instanceof ApiError ? err.message : t("common.genericError"));
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await forgotPassword(phone);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch (err) {
      reportError(err, () => {});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setErrorMessage(null);
    try {
      await forgotPassword(phone);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      reportError(err, () => {});
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await verifyResetCode(phone, code);
      setStep("newPassword");
    } catch (err) {
      reportError(err, () => {});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePassword(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(t("auth.resetPassword.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t("auth.resetPassword.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(phone, code, newPassword);
      setStep("success");
      setTimeout(onBackToLogin, 1500);
    } catch (err) {
      reportError(err, () => {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg bg-elevated border border-white/[0.10] px-4 py-2.5 text-sm text-ink-body"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>

      {step !== "success" && (
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors self-start"
        >
          <ArrowLeft size={16} />
          {t("auth.backToLogin")}
        </button>
      )}

      {/*
        Plain conditional render per step, not AnimatePresence mode="wait" —
        a key-swapped motion.div here got stuck mid-crossfade (the DOM kept
        showing the outgoing step after `step` had already advanced), the
        same bug AddBusinessPage.tsx hit with its step wrapper. Each step
        keeps its own mount-in fade instead.
      */}
      {step === "phone" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-ink">{t("auth.resetPassword.title")}</h3>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901234567"
              type="tel"
              className={inputClasses}
            />
            {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t("common.loading") : t("auth.resetPassword.sendCode")}
            </Button>
          </form>
        </motion.div>
      )}

      {step === "otp" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-bold text-ink">{t("auth.resetPassword.otpTitle")}</h3>
              <p className="text-sm text-ink-muted mt-1">
                {t("auth.resetPassword.otpSubtitle").replace("{phone}", phone)}
              </p>
            </div>

            <OtpInput value={code} onChange={setCode} length={OTP_LENGTH} />

            {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting || code.length !== OTP_LENGTH}
            >
              {submitting ? t("common.loading") : t("auth.resetPassword.verify")}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-sm text-primary hover:text-blue-300 disabled:text-ink-muted disabled:cursor-not-allowed transition-colors self-center"
            >
              {cooldown > 0
                ? t("auth.resetPassword.resendIn").replace("{s}", String(cooldown))
                : t("auth.resetPassword.resend")}
            </button>
          </form>
        </motion.div>
      )}

      {step === "newPassword" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-ink">{t("auth.resetPassword.newPasswordTitle")}</h3>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
              type="password"
              className={inputClasses}
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
              type="password"
              className={inputClasses}
            />
            {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t("common.loading") : t("auth.resetPassword.save")}
            </Button>
          </form>
        </motion.div>
      )}

      {step === "success" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-6 text-center"
        >
          <div className="size-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <Check size={24} />
          </div>
          <p className="text-ink font-medium">{t("auth.resetPassword.success")}</p>
        </motion.div>
      )}
    </div>
  );
}
