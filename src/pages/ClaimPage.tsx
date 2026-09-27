import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BusinessPreview from "../components/claim/BusinessPreview";
import MetaTags from "../components/seo/MetaTags";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useClaimFlow, type ClaimStep } from "../hooks/useClaimFlow";
import { useShouldAnimate } from "../lib/motion-config";
import CategoryStep from "./claim/steps/CategoryStep";
import EmailStep from "./claim/steps/EmailStep";
import LocationStep from "./claim/steps/LocationStep";
import NameStep from "./claim/steps/NameStep";
import PhoneStep from "./claim/steps/PhoneStep";
import SummaryStep from "./claim/steps/SummaryStep";
import VerificationStep from "./claim/steps/VerificationStep";
import WebsiteStep from "./claim/steps/WebsiteStep";

function SuccessPanel({ businessName, onDone }: { businessName: string; onDone: () => void }) {
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

      <h1 className="mt-6 text-2xl font-bold text-ink sm:text-3xl">{t("claim.successTitle")}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {t("claim.successSubtitle").replace("{name}", businessName)}
      </p>

      <button
        onClick={onDone}
        className="mt-8 h-14 w-full rounded-full bg-primary text-lg font-semibold text-white transition-colors hover:bg-blue-600"
      >
        {t("claim.goToDashboard")}
      </button>
    </div>
  );
}

/**
 * Business claim: eight single-field screens, then a summary.
 *
 * Split layout from `lg` up — the form on the left, a live preview of the page
 * being built on the right. The preview is the point: it turns filling in a
 * form into watching your own page appear, which is a very different thing to
 * ask someone to do. Below `lg` the preview moves under the form rather than
 * disappearing, so a phone still shows the payoff.
 */
export default function ClaimPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { token, openAuthModal } = useAuth();
  const shouldAnimate = useShouldAnimate();
  const claim = useClaimFlow();

  // POST /businesses is authenticated: an anonymous visitor would fill in
  // eight screens and only then be told to sign in. Ask at the door instead.
  useEffect(() => {
    if (!token) openAuthModal();
  }, [token, openAuthModal]);

  const { form, setField, step, goNext, goBack } = claim;

  function renderStep() {
    switch (step) {
      case "name":
        return <NameStep value={form.name} onChange={(v) => setField("name", v)} onNext={goNext} />;
      case "email":
        return (
          <EmailStep value={form.email} onChange={(v) => setField("email", v)} onNext={goNext} onBack={goBack} />
        );
      case "location":
        return (
          <LocationStep
            address={form.address}
            districtId={form.districtId}
            onAddressChange={(v) => setField("address", v)}
            onDistrictChange={(v) => setField("districtId", v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case "phone":
        return (
          <PhoneStep value={form.phone} onChange={(v) => setField("phone", v)} onNext={goNext} onBack={goBack} />
        );
      case "category":
        return (
          <CategoryStep
            value={form.categoryId}
            onChange={(v) => setField("categoryId", v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case "website":
        return (
          <WebsiteStep
            value={form.website}
            onChange={(v) => setField("website", v)}
            onNext={goNext}
            onBack={goBack}
            onSkip={() => {
              setField("website", "");
              goNext();
            }}
          />
        );
      case "verification":
        return (
          <VerificationStep
            value={form.verificationMethod}
            phone={form.phone}
            onChange={(v) => setField("verificationMethod", v)}
            onNext={goNext}
            onBack={goBack}
          />
        );
      case "summary":
        return (
          <SummaryStep
            form={form}
            submitting={claim.submitting}
            error={claim.error}
            onSubmit={claim.submit}
            onBack={goBack}
            onEdit={(target: ClaimStep) => claim.goToStep(target)}
          />
        );
    }
  }

  return (
    <>
      <MetaTags
        title="Biznesingizni bepul qo'shing — My Andijan"
        description="Biznesingizni My Andijan'ga bepul qo'shing. Mijozlar sizni oson topadi."
        noIndex
      />

      <div className="mx-auto w-full max-w-7xl px-6 py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] lg:gap-14">
          <div className="w-full max-w-md lg:max-w-none">
            {claim.submitted ? (
              <SuccessPanel
                businessName={form.name.trim()}
                onDone={() => navigate(`/${lang}/dashboard`, { state: { view: "businesses" } })}
              />
            ) : (
              <motion.div
                key={step}
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {renderStep()}
              </motion.div>
            )}
          </div>

          {/* Sticky so the preview stays in view while the left column
              advances through steps of differing heights. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <BusinessPreview form={form} />
          </div>
        </div>
      </div>
    </>
  );
}
