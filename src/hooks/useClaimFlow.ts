import { useCallback, useMemo, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { ApiError, createBusiness } from "../lib/api";
import { toE164 } from "../lib/phone";

export type ClaimStep =
  | "name"
  | "email"
  | "location"
  | "phone"
  | "category"
  | "website"
  | "verification"
  | "summary";

/** Screen order. `goNext`/`goBack` walk this rather than hard-coding transitions. */
export const CLAIM_STEPS: ClaimStep[] = [
  "name",
  "email",
  "location",
  "phone",
  "category",
  "website",
  "verification",
  "summary",
];

export type VerificationMethod = "sms" | "call";

export interface ClaimFormData {
  name: string;
  email: string;
  address: string;
  /** District id as a string because it comes from a <select>. Andijon by default. */
  districtId: string;
  /** National digits only (901234567); formatted for display at the edges. */
  phone: string;
  categoryId: string;
  website: string;
  verificationMethod: VerificationMethod;
}

/** Andijon city — the district most claimants are in, so it is pre-selected. */
export const DEFAULT_DISTRICT_ID = "1";

const EMPTY_FORM: ClaimFormData = {
  name: "",
  email: "",
  address: "",
  districtId: DEFAULT_DISTRICT_ID,
  phone: "",
  categoryId: "",
  website: "",
  verificationMethod: "sms",
};

interface UseClaimFlowResult {
  step: ClaimStep;
  form: ClaimFormData;
  setField: <K extends keyof ClaimFormData>(key: K, value: ClaimFormData[K]) => void;
  goNext: () => void;
  goBack: () => void;
  /** Jumps to a specific screen — backs the summary's per-row Edit links. */
  goToStep: (step: ClaimStep) => void;
  canGoBack: boolean;
  submit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
}

export function useClaimFlow(): UseClaimFlowResult {
  const { t } = useLanguage();
  const [step, setStep] = useState<ClaimStep>("name");
  const [form, setForm] = useState<ClaimFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const index = CLAIM_STEPS.indexOf(step);

  const setField = useCallback(<K extends keyof ClaimFormData>(key: K, value: ClaimFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  const goNext = useCallback(() => {
    setError(null);
    setStep((current) => {
      const at = CLAIM_STEPS.indexOf(current);
      return CLAIM_STEPS[Math.min(at + 1, CLAIM_STEPS.length - 1)];
    });
  }, []);

  const goBack = useCallback(() => {
    setError(null);
    setStep((current) => {
      const at = CLAIM_STEPS.indexOf(current);
      return CLAIM_STEPS[Math.max(at - 1, 0)];
    });
  }, []);

  const goToStep = useCallback((target: ClaimStep) => {
    setError(null);
    setStep(target);
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createBusiness({
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        phone: toE164(form.phone),
        districtId: Number(form.districtId),
        address: form.address.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.website.trim() ? { website: form.website.trim() } : {}),
        // The claim flow deliberately doesn't ask for opening hours — that is
        // the kind of detail an owner fills in later from the dashboard, and
        // adding a ninth screen for it would cost more sign-ups than it is
        // worth. The API treats hours as optional.
        hours: [],
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError(t("claim.errorAuthRequired"));
        } else if (err.status === 409) {
          setError(t("claim.errorDuplicate"));
        } else {
          setError(err.message || t("common.genericError"));
        }
      } else {
        setError(t("claim.errorNetwork"));
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, t]);

  return useMemo(
    () => ({
      step,
      form,
      setField,
      goNext,
      goBack,
      goToStep,
      canGoBack: index > 0,
      submit,
      submitting,
      error,
      submitted,
    }),
    [step, form, setField, goNext, goBack, goToStep, index, submit, submitting, error, submitted],
  );
}
