import { useLanguage } from "../../../contexts/LanguageContext";
import { localizedName } from "../../../lib/localize";
import type { Region } from "../../../types";
import Button from "../../../components/ui/Button";
import FormField, { fieldInputClasses } from "./FormField";
import type { BusinessFormData, FormErrors } from "./types";

interface Step2Props {
  data: BusinessFormData;
  errors: FormErrors;
  regions: Region[];
  regionsLoading: boolean;
  onChange: <K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Location({ data, errors, regions, regionsLoading, onChange, onNext, onBack }: Step2Props) {
  const { lang, t } = useLanguage();
  const region = regions[0];
  const districts = region?.districts ?? [];
  const selectedDistrict = districts.find((d) => String(d.id) === data.districtId);
  const cities = selectedDistrict?.cities ?? [];

  function handleDistrictChange(value: string) {
    onChange("districtId", value);
    onChange("cityId", "");
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField label={t("addBusiness.region")}>
        <input
          value={region ? localizedName(region, lang) : t("common.loading")}
          disabled
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.district")} htmlFor="business-district" required error={errors.districtId}>
        <select
          id="business-district"
          value={data.districtId}
          onChange={(e) => handleDistrictChange(e.target.value)}
          disabled={regionsLoading}
          className={`${fieldInputClasses} appearance-none`}
        >
          <option value="">{t("common.select")}</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {localizedName(district, lang)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("addBusiness.city")} htmlFor="business-city">
        <select
          id="business-city"
          value={data.cityId}
          onChange={(e) => onChange("cityId", e.target.value)}
          disabled={cities.length === 0}
          className={`${fieldInputClasses} appearance-none`}
        >
          <option value="">{t("common.select")}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {localizedName(city, lang)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("addBusiness.address")} htmlFor="business-address" required error={errors.address}>
        <textarea
          id="business-address"
          value={data.address}
          onChange={(e) => onChange("address", e.target.value)}
          rows={2}
          className={`${fieldInputClasses} h-auto py-3 resize-none`}
        />
      </FormField>

      <FormField label={t("addBusiness.landmark")} htmlFor="business-landmark">
        <input
          id="business-landmark"
          value={data.landmark}
          onChange={(e) => onChange("landmark", e.target.value)}
          placeholder={t("addBusiness.landmarkPlaceholder")}
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.mapUrl")} htmlFor="business-map-url">
        <input
          id="business-map-url"
          value={data.mapUrl}
          onChange={(e) => onChange("mapUrl", e.target.value)}
          placeholder="https://maps.google.com/..."
          type="url"
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.email")} htmlFor="business-email">
        <input
          id="business-email"
          value={data.email}
          onChange={(e) => onChange("email", e.target.value)}
          type="email"
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.telegram")} htmlFor="business-telegram">
        <input
          id="business-telegram"
          value={data.telegram}
          onChange={(e) => onChange("telegram", e.target.value)}
          placeholder={t("addBusiness.telegramPlaceholder")}
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.instagram")} htmlFor="business-instagram">
        <input
          id="business-instagram"
          value={data.instagram}
          onChange={(e) => onChange("instagram", e.target.value)}
          placeholder={t("addBusiness.instagramPlaceholder")}
          className={fieldInputClasses}
        />
      </FormField>

      <FormField label={t("addBusiness.website")} htmlFor="business-website">
        <input
          id="business-website"
          value={data.website}
          onChange={(e) => onChange("website", e.target.value)}
          placeholder="https://..."
          type="url"
          className={fieldInputClasses}
        />
      </FormField>

      <div className="flex flex-col sm:flex-row gap-3 mt-1">
        <Button type="button" variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onBack}>
          {t("addBusiness.back")}
        </Button>
        <Button type="button" variant="primary" size="lg" className="w-full flex-1" onClick={onNext}>
          {t("addBusiness.next")}
        </Button>
      </div>
    </div>
  );
}
