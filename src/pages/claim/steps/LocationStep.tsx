import { useLanguage } from "../../../contexts/LanguageContext";
import { useRegions } from "../../../hooks/useRegions";
import { localizedName } from "../../../lib/localize";
import StepShell, { FIELD_CLASSES } from "../StepShell";

interface LocationStepProps {
  address: string;
  districtId: string;
  onAddressChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

/** POST /businesses rejects an address shorter than this, so the UI matches. */
const MIN_ADDRESS_LENGTH = 5;

export default function LocationStep({
  address,
  districtId,
  onAddressChange,
  onDistrictChange,
  onNext,
  onBack,
}: LocationStepProps) {
  const { lang, t } = useLanguage();
  const { regions } = useRegions(lang);
  const districts = regions[0]?.districts ?? [];

  const trimmed = address.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_ADDRESS_LENGTH;

  return (
    <StepShell
      heading={t("claim.locationTitle")}
      subheading={t("claim.locationSubtitle")}
      onSubmit={onNext}
      onBack={onBack}
      canContinue={trimmed.length >= MIN_ADDRESS_LENGTH && !!districtId}
      error={tooShort ? t("claim.errorAddressShort") : null}
    >
      <div className="flex flex-col gap-3">
        <input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder={t("claim.addressPlaceholder")}
          aria-label={t("claim.addressLabel")}
          autoComplete="street-address"
          autoFocus
          className={FIELD_CLASSES}
        />

        <div>
          <label htmlFor="claim-district" className="text-sm font-medium text-ink-body">
            {t("claim.districtLabel")}
          </label>
          <select
            id="claim-district"
            value={districtId}
            onChange={(e) => onDistrictChange(e.target.value)}
            className={`${FIELD_CLASSES} mt-1.5 appearance-none`}
          >
            {districts.map((district) => (
              <option key={district.id} value={String(district.id)}>
                {localizedName(district, lang)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-ink-muted">{t("claim.addressHelper")}</p>
    </StepShell>
  );
}
