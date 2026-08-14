import { useLanguage } from "../../../contexts/LanguageContext";
import Button from "../../../components/ui/Button";
import { DAY_LABEL_KEYS, type BusinessFormData, type FormErrors, type WorkingHourRow } from "./types";

interface Step3Props {
  data: BusinessFormData;
  errors: FormErrors;
  submitting: boolean;
  onUpdateHour: (index: number, patch: Partial<WorkingHourRow>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const timeInputClasses =
  "h-11 bg-elevated border border-white/[0.10] rounded-lg px-3 text-ink outline-none focus:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed";

export default function Step3Hours({ data, errors, submitting, onUpdateHour, onSubmit, onBack }: Step3Props) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {data.workingHours.map((row, index) => (
          <div
            key={row.day}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-elevated/40 border border-white/[0.06] rounded-xl p-3"
          >
            <div className="text-sm font-medium text-ink sm:w-24 shrink-0">{t(DAY_LABEL_KEYS[row.day])}</div>

            <div className="flex flex-wrap items-center gap-3 flex-1">
              <input
                type="time"
                value={row.open}
                disabled={row.isClosed}
                onChange={(e) => onUpdateHour(index, { open: e.target.value })}
                className={timeInputClasses}
              />
              <input
                type="time"
                value={row.close}
                disabled={row.isClosed}
                onChange={(e) => onUpdateHour(index, { close: e.target.value })}
                className={timeInputClasses}
              />

              <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={row.isClosed}
                  onChange={(e) => onUpdateHour(index, { isClosed: e.target.checked })}
                  className="size-4 rounded accent-primary"
                />
                {t("addBusiness.dayOff")}
              </label>

              {row.isClosed && <span className="text-xs text-ink-muted">{t("addBusiness.dayOffLabel")}</span>}
            </div>
          </div>
        ))}
      </div>

      {errors.workingHours && <p className="text-xs text-danger">{errors.workingHours}</p>}

      <div className="flex flex-col sm:flex-row gap-3 mt-1">
        <Button type="button" variant="ghost" size="lg" className="w-full sm:w-auto" onClick={onBack}>
          {t("addBusiness.back")}
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full flex-1"
          disabled={submitting}
          onClick={onSubmit}
        >
          {submitting ? t("common.loading") : t("addBusiness.save")}
        </Button>
      </div>
    </div>
  );
}
