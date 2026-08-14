import { Check } from "lucide-react";
import { useLanguage } from "../../../contexts/LanguageContext";
import type { TranslationKey } from "../../../i18n";
import type { FormStep } from "./types";

const STEPS: { step: FormStep; labelKey: TranslationKey }[] = [
  { step: 1, labelKey: "addBusiness.step1" },
  { step: 2, labelKey: "addBusiness.step2" },
  { step: 3, labelKey: "addBusiness.step3" },
];

interface StepIndicatorProps {
  current: FormStep;
}

export default function StepIndicator({ current }: StepIndicatorProps) {
  const { t } = useLanguage();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {STEPS.map(({ step, labelKey }) => {
        const isActive = step === current;
        const isDone = step < current;

        return (
          <div key={step} className="flex flex-col items-center gap-1.5 shrink-0" style={{ minWidth: 84 }}>
            <div
              className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${
                isDone
                  ? "bg-success text-white"
                  : isActive
                    ? "bg-primary text-white"
                    : "bg-white/[0.05] text-ink-muted"
              }`}
            >
              {isDone ? <Check size={16} /> : step}
            </div>
            <span className={`text-xs text-center ${isActive ? "text-ink" : "text-ink-muted"}`}>{t(labelKey)}</span>
          </div>
        );
      })}
    </div>
  );
}
