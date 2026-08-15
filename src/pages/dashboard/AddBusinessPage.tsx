import { AnimatePresence, motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MetaTags from "../../components/seo/MetaTags";
import EmptyState from "../../components/ui/EmptyState";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";
import { useRegions } from "../../hooks/useRegions";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { ApiError, createBusiness } from "../../lib/api";
import type { TranslationKey } from "../../i18n";
import { TRANSITIONS, useMotionTransition } from "../../lib/motion-config";
import type { CreateBusinessPayload } from "../../types";
import DashboardLayout from "./DashboardLayout";
import type { DashboardView } from "./types";
import Step1BasicInfo from "./addBusiness/Step1BasicInfo";
import Step2Location from "./addBusiness/Step2Location";
import Step3Hours from "./addBusiness/Step3Hours";
import StepIndicator from "./addBusiness/StepIndicator";
import { DAY_TO_INDEX, emptyFormData, type BusinessFormData, type FormErrors, type FormStep, type WorkingHourRow } from "./addBusiness/types";

type Translate = (key: TranslationKey) => string;

function validateStep1(data: BusinessFormData, t: Translate): FormErrors {
  const errors: FormErrors = {};
  if (data.name.trim().length < 2) errors.name = t("addBusiness.errors.nameRequired");
  if (!data.categoryId) errors.categoryId = t("addBusiness.errors.categoryRequired");
  if (!/^\+998\d{9}$/.test(data.phone)) errors.phone = t("addBusiness.errors.phoneInvalid");
  return errors;
}

function validateStep2(data: BusinessFormData, t: Translate): FormErrors {
  const errors: FormErrors = {};
  if (!data.districtId) errors.districtId = t("addBusiness.errors.districtRequired");
  if (data.address.trim().length < 5) errors.address = t("addBusiness.errors.addressRequired");
  return errors;
}

function validateStep3(data: BusinessFormData, t: Translate): FormErrors {
  const errors: FormErrors = {};
  if (!data.workingHours.some((row) => !row.isClosed)) errors.workingHours = t("addBusiness.errors.hoursRequired");
  return errors;
}

function buildPayload(data: BusinessFormData): CreateBusinessPayload {
  return {
    name: data.name.trim(),
    categoryId: Number(data.categoryId),
    description: data.description.trim() || undefined,
    phone: data.phone,
    secondaryPhone: data.secondaryPhone || undefined,
    districtId: Number(data.districtId),
    cityId: data.cityId ? Number(data.cityId) : undefined,
    address: data.address.trim(),
    landmark: data.landmark || undefined,
    mapUrl: data.mapUrl || undefined,
    email: data.email || undefined,
    telegram: data.telegram || undefined,
    instagram: data.instagram || undefined,
    website: data.website || undefined,
    hours: data.workingHours.map((row) => ({
      day: DAY_TO_INDEX[row.day],
      openTime: row.isClosed ? null : row.open,
      closeTime: row.isClosed ? null : row.close,
      isClosed: row.isClosed,
    })),
  };
}

export default function AddBusinessPage() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const { user, token } = useRequireAuth();
  const { categories, loading: categoriesLoading } = useCategories(lang);
  const { regions, loading: regionsLoading } = useRegions(lang);

  // Fixed rather than stateful: the sidebar is only present to navigate away
  // from this page (see goToDashboardView below), never to switch views
  // in place, so there is nothing here that ever changes it.
  const dashboardView: DashboardView = "businesses";
  const [step, setStep] = useState<FormStep>(1);
  const [data, setData] = useState<BusinessFormData>(emptyFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "info" | "error"; text: string } | null>(null);

  const stepTransition = useMotionTransition(TRANSITIONS.fast);

  function updateField<K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateHour(index: number, patch: Partial<WorkingHourRow>) {
    setData((prev) => ({
      ...prev,
      workingHours: prev.workingHours.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
    setErrors((prev) => {
      if (!("workingHours" in prev)) return prev;
      const next = { ...prev };
      delete next.workingHours;
      return next;
    });
  }

  function handleNextFromStep1() {
    const stepErrors = validateStep1(data, t);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep(2);
  }

  function handleNextFromStep2() {
    const stepErrors = validateStep2(data, t);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep(3);
  }

  async function handleSubmit() {
    const stepErrors = validateStep3(data, t);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;

    setSubmitting(true);
    setNotice(null);
    const payload = buildPayload(data);

    try {
      await createBusiness(payload);
      setNotice({ tone: "success", text: t("addBusiness.success") });
      toast.success(t("addBusiness.success"));
      setTimeout(() => navigate(`/${lang}/dashboard`, { state: { view: "businesses" } }), 1200);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        console.log("[AddBusinessPage] POST /businesses is not live yet. Payload that would have been sent:", payload);
        setNotice({ tone: "info", text: t("addBusiness.comingSoon") });
      } else {
        const message = err instanceof ApiError ? err.message : t("common.genericError");
        setNotice({ tone: "error", text: message });
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function goToDashboardView(view: DashboardView) {
    navigate(`/${lang}/dashboard`, { state: { view } });
  }

  // No token: useRequireAuth already opened the AuthModal. Render nothing
  // rather than the "not an owner" message, which would flash under it.
  if (!token || !user) return null;

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-6">
        <EmptyState
          icon={Building2}
          title="Siz biznes egasi emassiz"
          body="Bu bo'lim faqat biznes egalari uchun mavjud."
          actionLabel="Biznesni qo'shish"
          onAction={() => navigate(`/${lang}/search`)}
        />
      </div>
    );
  }

  return (
    <>
      <MetaTags title="Yangi biznes — My Andijan" description="Yangi biznes qo'shish." noIndex />
      <DashboardLayout activeView={dashboardView} onSelectView={goToDashboardView}>
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">{t("addBusiness.title")}</h1>
            <p className="text-sm text-ink-muted mt-1">{t("addBusiness.subtitle")}</p>
          </div>

          <StepIndicator current={step} />

          <AnimatePresence>
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`rounded-lg border px-4 py-2.5 text-sm ${
                  notice.tone === "success"
                    ? "bg-success/10 border-success/20 text-success"
                    : notice.tone === "error"
                      ? "bg-danger/10 border-danger/20 text-danger"
                      : "bg-elevated border-white/[0.10] text-ink-body"
                }`}
              >
                {notice.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/*
            Plain conditional render, not AnimatePresence — a key-swapped
            motion.div here got stuck mid-crossfade often enough (the DOM kept
            showing the outgoing step after `step` had already advanced) that
            it wasn't worth the animation. Nothing in this feature requires
            the transition to be animated.
          */}
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stepTransition}>
            {step === 1 && (
              <Step1BasicInfo
                data={data}
                errors={errors}
                categories={categories}
                categoriesLoading={categoriesLoading}
                onChange={updateField}
                onNext={handleNextFromStep1}
              />
            )}
            {step === 2 && (
              <Step2Location
                data={data}
                errors={errors}
                regions={regions}
                regionsLoading={regionsLoading}
                onChange={updateField}
                onNext={handleNextFromStep2}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <Step3Hours
                data={data}
                errors={errors}
                submitting={submitting}
                onUpdateHour={updateHour}
                onSubmit={handleSubmit}
                onBack={() => setStep(2)}
              />
            )}
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
}
