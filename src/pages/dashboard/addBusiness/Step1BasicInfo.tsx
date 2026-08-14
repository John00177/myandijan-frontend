import { Upload } from "lucide-react";
import { useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import type { Category } from "../../../types";
import { localizedName } from "../../../lib/localize";
import Button from "../../../components/ui/Button";
import FormField, { fieldInputClasses } from "./FormField";
import type { BusinessFormData, FormErrors } from "./types";

interface Step1Props {
  data: BusinessFormData;
  errors: FormErrors;
  categories: Category[];
  categoriesLoading: boolean;
  onChange: <K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) => void;
  onNext: () => void;
}

function isStep1Valid(data: BusinessFormData): boolean {
  return data.name.trim().length >= 2 && data.categoryId !== "" && /^\+998\d{9}$/.test(data.phone);
}

export default function Step1BasicInfo({ data, errors, categories, categoriesLoading, onChange, onNext }: Step1Props) {
  const { lang, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const businessCategories = categories.filter((c) => c.allowBusiness);

  return (
    <div className="flex flex-col gap-5">
      <FormField label={t("addBusiness.name")} htmlFor="business-name" required error={errors.name}>
        <input
          id="business-name"
          value={data.name}
          onChange={(e) => onChange("name", e.target.value)}
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.category")} htmlFor="business-category" required error={errors.categoryId}>
        <select
          id="business-category"
          value={data.categoryId}
          onChange={(e) => onChange("categoryId", e.target.value)}
          disabled={categoriesLoading}
          className={`${fieldInputClasses} appearance-none`}
        >
          <option value="">{t("common.select")}</option>
          {businessCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {localizedName(category, lang)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("addBusiness.description")} htmlFor="business-description">
        <textarea
          id="business-description"
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder={t("addBusiness.descriptionPlaceholder")}
          rows={4}
          className={`${fieldInputClasses} h-auto py-3 resize-none`}
        />
      </FormField>

      <FormField label={t("addBusiness.phone")} htmlFor="business-phone" required error={errors.phone}>
        <input
          id="business-phone"
          value={data.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="+998901234567"
          type="tel"
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.secondaryPhone")} htmlFor="business-secondary-phone">
        <input
          id="business-secondary-phone"
          value={data.secondaryPhone}
          onChange={(e) => onChange("secondaryPhone", e.target.value)}
          placeholder="+998901234567"
          type="tel"
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.photo")}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-white/[0.15] rounded-xl p-8 text-center hover:border-primary/40 transition-colors w-full"
        >
          <Upload size={32} className="text-ink-muted mx-auto" />
          <div className="text-sm text-ink-muted mt-2">
            {data.coverPhoto ? data.coverPhoto.name : t("addBusiness.photoUpload")}
          </div>
          <div className="text-xs text-ink-muted mt-1">{t("addBusiness.photoHint")}</div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => onChange("coverPhoto", e.target.files?.[0] ?? null)}
        />
      </FormField>

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full mt-1"
        disabled={!isStep1Valid(data)}
        onClick={onNext}
      >
        {t("addBusiness.next")}
      </Button>
    </div>
  );
}
