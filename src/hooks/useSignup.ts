import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import type { TranslationKey } from "../i18n";
import { ApiError, requestOtp, saveSignupProfile, verifyOtp } from "../lib/api";
import { digitsOf, toE164 } from "../lib/phone";

export type SignupStep = "phone" | "otp" | "profile" | "success";

export const OTP_LENGTH = 6;
export const RESEND_COOLDOWN_SECONDS = 45;

interface UseSignupResult {
  step: SignupStep;
  /** Raw national digits, e.g. "901234567". */
  phone: string;
  /** Formatted for display, e.g. "+998 90 123 45 67". */
  phoneDisplay: string;
  submitting: boolean;
  error: string | null;
  /** Seconds left before the code can be resent; 0 means resend is available. */
  resendIn: number;
  submitPhone: (phone: string) => Promise<void>;
  submitOtp: (code: string) => Promise<void>;
  submitProfile: (input: { firstName: string; lastName: string; avatar: File | null }) => Promise<void>;
  skipProfile: () => void;
  resendOtp: () => Promise<void>;
  goBack: () => void;
  clearError: () => void;
}

/**
 * Drives the four signup steps and owns every network call the flow makes.
 *
 * The account is created at the OTP step, not at the end: verify returns a
 * token, which is stored immediately. Step 3 is therefore pure progressive
 * profiling and skipping it leaves a fully working account behind — the whole
 * reason the skip button can exist at all.
 */
export function useSignup(): UseSignupResult {
  const { t } = useLanguage();
  const { register } = useAuth();

  const [step, setStep] = useState<SignupStep>("phone");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const clearError = useCallback(() => setError(null), []);

  const messageFor = useCallback(
    (err: unknown, fallbackKey: TranslationKey) => {
      if (err instanceof ApiError) {
        // The API answers a wrong OR expired code with one 400 and one
        // message, deliberately — telling the two apart would confirm to a
        // guesser that a given code was real but stale.
        if (err.status === 400 || err.status === 422) return t("signup.errorInvalidCode");
        if (err.status === 429) return t("signup.errorTooMany");
        if (err.status === 403) return t("signup.errorAccountInactive");
        if (err.message) return err.message;
      }
      // An aborted fetch (our own 10s timeout) and a genuinely offline device
      // both land here; neither is a wrong code, so they must not read as one.
      if (err instanceof DOMException && err.name === "AbortError") return t("signup.errorNetwork");
      if (err instanceof TypeError) return t("signup.errorNetwork");
      return t(fallbackKey);
    },
    [t],
  );

  const submitPhone = useCallback(
    async (nextPhone: string) => {
      const digits = digitsOf(nextPhone);
      setSubmitting(true);
      setError(null);
      try {
        await requestOtp(toE164(digits));
        setPhone(digits);
        setStep("otp");
        setResendIn(RESEND_COOLDOWN_SECONDS);
      } catch (err) {
        setError(messageFor(err, "auth.registerError"));
      } finally {
        setSubmitting(false);
      }
    },
    [messageFor],
  );

  const submitOtp = useCallback(
    async (code: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await verifyOtp(toE164(phone), code);
        // The account exists from here on. Storing the token before step 3
        // is what makes the profile step genuinely optional.
        register(res.accessToken, res.user, res.refreshToken);
        setStep("profile");
      } catch (err) {
        setError(messageFor(err, "signup.errorInvalidCode"));
      } finally {
        setSubmitting(false);
      }
    },
    [phone, register, messageFor],
  );

  const resendOtp = useCallback(async () => {
    if (resendIn > 0) return;
    setError(null);
    try {
      await requestOtp(toE164(phone));
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(messageFor(err, "common.genericError"));
    }
  }, [phone, resendIn, messageFor]);

  const submitProfile = useCallback(
    async (input: { firstName: string; lastName: string; avatar: File | null }) => {
      setSubmitting(true);
      setError(null);
      try {
        await saveSignupProfile(input);
        setStep("success");
      } catch (err) {
        // The account already exists and the token is stored, so a failed
        // profile save must not strand the user on step 3 with no way out.
        setError(messageFor(err, "common.genericError"));
      } finally {
        setSubmitting(false);
      }
    },
    [messageFor],
  );

  const skipProfile = useCallback(() => setStep("success"), []);

  const goBack = useCallback(() => {
    setError(null);
    setStep((current) => (current === "otp" ? "phone" : current));
  }, []);

  return {
    step,
    phone,
    phoneDisplay: toE164(phone, { pretty: true }),
    submitting,
    error,
    resendIn,
    submitPhone,
    submitOtp,
    submitProfile,
    skipProfile,
    resendOtp,
    goBack,
    clearError,
  };
}
