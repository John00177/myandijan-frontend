import { Check } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useCategories } from "../../../hooks/useCategories";
import { useRegions } from "../../../hooks/useRegions";
import { localizedName } from "../../../lib/localize";
import { toE164 } from "../../../lib/phone";
import StepShell from "../StepShell";
import type { ClaimFormData, ClaimStep } from "../../../hooks/useClaimFlow";

interface SummaryStepProps {
  form: ClaimFormData;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
  onBack: () => void;
  /** Jumps straight back to the screen that owns a given value. */
  onEdit: (step: ClaimStep) => void;
}

export default function SummaryStep({ form, submitting, error, onSubmit, onBack, onEdit }: SummaryStepProps) {
  const { lang, t } = useLanguage();
  const { categories } = useCategories(lang);
  const { regions } = useRegions(lang);

  const category = categories.find((c) => String(c.id) === form.categoryId);
  const district = regions[0]?.districts.find((d) => String(d.id) === form.districtId);

  const rows: { step: ClaimStep; label: string; value: string | null }[] = [
    { step: "name", label: t("claim.nameLabel"), value: form.name.trim() || null },
    { step: "category", label: t("claim.categoryLabel"), value: category ? localizedName(category, lang) : null },
    {
      step: "location",
      label: t("claim.addressLabel"),
      value: [form.address.trim(), district ? localizedName(district, lang) : null].filter(Boolean).join(", ") || null,
    },
    { step: "phone", label: t("claim.phoneLabel"), value: form.phone ? toE164(form.phone, { pretty: true }) : null },
    { step: "email", label: t("claim.emailLabel"), value: form.email.trim() || null },
    { step: "website", label: t("claim.websiteLabel"), value: form.website.trim() || null },
    {
      step: "verification",
      label: t("claim.verifyLabel"),
      value: form.verificationMethod === "sms" ? t("claim.verifySms") : t("claim.verifyCall"),
    },
  ];

  return (
    <StepShell
      heading={t("claim.summaryTitle")}
      subheading={t("claim.summarySubtitle")}
      onSubmit={onSubmit}
      onBack={onBack}
      submitting={submitting}
      continueLabel={t("claim.publish")}
      error={error}
    >
      <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08]">
        {rows.map((row) => (
          <div key={row.step} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wider text-ink-muted">{row.label}</dt>
              <dd className={`mt-0.5 text-sm ${row.value ? "text-ink" : "text-ink-muted"}`}>
                {row.value ?? t("claim.notProvided")}
              </dd>
            </div>
            <button
              type="button"
              onClick={() => onEdit(row.step)}
              className="shrink-0 text-xs font-medium text-primary hover:text-blue-300"
            >
              {t("claim.edit")}
            </button>
          </div>
        ))}
      </dl>

      <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
        <Check size={14} className="mt-0.5 shrink-0 text-brand-green" />
        {t("claim.pendingNote")}
      </p>
    </StepShell>
  );
}
