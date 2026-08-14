import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import ForgotPasswordFlow from "./ForgotPasswordFlow";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type Tab = "login" | "register";
type View = Tab | "forgot";

/**
 * Hardened auth modal.
 *
 * Interaction is never gated on animation state: the Escape listener and the
 * scrim's onClick are plain handlers, and the panel carries pointer-events from
 * its first frame, so the modal is dismissible and usable while the spring is
 * still settling. The spring itself is duration-based (bounded ~0.4s) rather
 * than open-ended physics, so it cannot be left stranded part-way on a slow CPU.
 */
export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  const { t } = useLanguage();
  const [view, setView] = useState<View>("login");
  const shouldAnimate = useShouldAnimate();
  const modalTransition = useMotionTransition(TRANSITIONS.modalSpring);
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);

  useEffect(() => {
    if (!isAuthModalOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAuthModal();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  // Always reopen on the login step rather than wherever the user left off.
  useEffect(() => {
    if (isAuthModalOpen) setView("login");
  }, [isAuthModalOpen]);

  function setTab(tab: Tab) {
    setView(tab);
  }

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <>
          {/*
            Solid black animated to 0.6, not bg-black/60 animated to 0.6 —
            those compound to ~36% and the scrim reads washed out.
          */}
          {/*
            `pointerEvents: "none"` is part of the exit target. It is not an
            interpolatable value, so Framer applies it the instant the exit
            begins. If the exit animation ever stalls before unmounting, the
            scrim is already click-through rather than an invisible full-screen
            layer swallowing every click.
          */}
          <motion.div
            className="fixed inset-0 z-50 bg-black backdrop-blur-sm"
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.6, pointerEvents: "auto" }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={backdropTransition}
            onClick={closeAuthModal}
          />

          {/*
            Flex centring, not -translate-x/y-1/2: Framer writes an inline
            transform for scale/y which would override those utilities and knock
            the panel off centre.
          */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("auth.login")}
              className="w-full max-w-md p-6 rounded-2xl bg-card border border-white/[0.08] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] pointer-events-auto"
              initial={shouldAnimate ? { scale: 0.9, opacity: 0, y: 20 } : false}
              animate={{ scale: 1, opacity: 1, y: 0, pointerEvents: "auto" }}
              exit={{ scale: 0.95, opacity: 0, y: 10, pointerEvents: "none" }}
              transition={modalTransition}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xl tracking-tight">
                  <span className="text-ink">My</span> <span className="text-primary">Andijan</span>
                </span>
                <button onClick={closeAuthModal} aria-label="Close" className="text-ink-muted hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              {view !== "forgot" && (
                <div className="grid grid-cols-2 gap-2 mt-6 bg-elevated rounded-lg p-1">
                  <button
                    onClick={() => setTab("login")}
                    className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                      view === "login" ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {t("auth.login")}
                  </button>
                  <button
                    onClick={() => setTab("register")}
                    className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                      view === "register" ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {t("auth.register")}
                  </button>
                </div>
              )}

              <div className="mt-6">
                {view === "login" && (
                  <LoginForm onSuccess={closeAuthModal} onForgotPassword={() => setView("forgot")} />
                )}
                {view === "register" && <RegisterForm onSuccess={closeAuthModal} />}
                {view === "forgot" && <ForgotPasswordFlow onBackToLogin={() => setView("login")} />}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
