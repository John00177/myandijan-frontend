import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MetaTags from "../components/seo/MetaTags";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSignup } from "../hooks/useSignup";
import { useShouldAnimate } from "../lib/motion-config";
import OtpScreen from "./signup/OtpScreen";
import PhoneScreen from "./signup/PhoneScreen";
import ProfileScreen from "./signup/ProfileScreen";

function SuccessScreen({ onStart }: { onStart: () => void }) {
  const { t } = useLanguage();
  const shouldAnimate = useShouldAnimate();

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success"
        initial={shouldAnimate ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
      >
        <Check size={38} strokeWidth={3} />
      </motion.div>

      <h1 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">{t("signup.successTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">{t("signup.successSubtitle")}</p>

      <button
        onClick={onStart}
        className="mt-8 h-14 w-full rounded-full bg-primary text-lg font-semibold text-white transition-colors hover:bg-blue-600"
      >
        {t("signup.start")}
      </button>
    </div>
  );
}

/**
 * Phone-first signup: phone → code → profile → done.
 *
 * Deliberately has no progress bar or step counter. Not showing how many steps
 * remain is the point — an owner who can see "1 of 4" at the first screen is
 * being given a reason to stop before starting.
 */
export default function SignupPage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { token } = useAuth();
  const shouldAnimate = useShouldAnimate();
  const signup = useSignup();
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  // Someone who is already signed in has nothing to do here.
  useEffect(() => {
    if (token && signup.step === "phone") navigate(`/${lang}`, { replace: true });
  }, [token, signup.step, lang, navigate]);

  function handleSocial() {
    // Neither Telegram nor Google OAuth exists on the API yet. Saying so is
    // better than a button that silently does nothing.
    setSocialNotice(t("signup.socialComingSoon"));
  }

  /*
   * The entering screen animates; nothing waits on the leaving one.
   *
   * This started as <AnimatePresence mode="wait">, which holds the next step
   * back until the previous one reports its exit animation finished. In this
   * app that callback is not dependable — the same failure is why
   * SafeScrollReveal ships a watchdog that force-reveals content when motion
   * never fires — and when it doesn't arrive the flow deadlocks: state has
   * already advanced to the next step while the screen still shows the old
   * one. Keying a plain motion.div gives the same slide-up + fade-in on every
   * step and cannot strand the user mid-signup.
   */
  const enter = { opacity: 0, y: 24 };
  const center = { opacity: 1, y: 0 };

  return (
    <>
      <MetaTags
        title="Ro'yxatdan o'tish — My Andijan"
        description="Telefon raqamingiz orqali My Andijan'ga ro'yxatdan o'ting."
        noIndex
      />

      <div className="mx-auto flex w-full max-w-md flex-col px-6 py-10 sm:py-14">
        <motion.div
          key={signup.step}
          initial={shouldAnimate ? enter : false}
          animate={center}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
            {signup.step === "phone" && (
              <PhoneScreen
                submitting={signup.submitting}
                error={signup.error}
                onSubmit={signup.submitPhone}
                onClearError={signup.clearError}
                onSocial={handleSocial}
                socialNotice={socialNotice}
              />
            )}

            {signup.step === "otp" && (
              <OtpScreen
                phoneDisplay={signup.phoneDisplay}
                submitting={signup.submitting}
                error={signup.error}
                resendIn={signup.resendIn}
                onSubmit={signup.submitOtp}
                onResend={signup.resendOtp}
                onBack={signup.goBack}
                onClearError={signup.clearError}
              />
            )}

            {signup.step === "profile" && (
              <ProfileScreen
                submitting={signup.submitting}
                error={signup.error}
                onSubmit={signup.submitProfile}
                onSkip={signup.skipProfile}
              />
            )}

            {signup.step === "success" && <SuccessScreen onStart={() => navigate(`/${lang}`)} />}
        </motion.div>
      </div>
    </>
  );
}
