import Badge from "../ui/Badge";
import { useLanguage } from "../../contexts/LanguageContext";
import type { BusinessHours } from "../../types";

interface OpenNowBadgeProps {
  hours: BusinessHours[] | null | undefined;
  /** Compact renders a small dot + label instead of the full pill badge — used in list cards. */
  compact?: boolean;
}

/**
 * `hours[].day` is 0=Monday..6=Sunday (matches Branch.hours from the API —
 * see BranchesSection/EditBusinessModal, which use the same convention).
 * JS's Date.getDay() is 0=Sunday..6=Saturday, so it needs remapping before
 * it can index into `hours`.
 */
function todayIndex(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isOpenNow(hours: BusinessHours[] | null | undefined): boolean | null {
  if (!hours || hours.length === 0) return null;
  const today = hours.find((h) => h.day === todayIndex());
  if (!today || today.isClosed || !today.openTime || !today.closeTime) return false;

  const open = toMinutes(today.openTime);
  const close = toMinutes(today.closeTime);
  if (open == null || close == null) return null;

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  // Overnight hours (e.g. 20:00–02:00) wrap past midnight — the close time
  // being earlier than open is the signal, not a data error.
  if (close <= open) {
    return nowMinutes >= open || nowMinutes < close;
  }
  return nowMinutes >= open && nowMinutes < close;
}

export default function OpenNowBadge({ hours, compact = false }: OpenNowBadgeProps) {
  const { t } = useLanguage();
  const open = isOpenNow(hours);
  // No hours data at all — stay silent rather than falsely claiming closed.
  if (open === null) return null;

  const label = open ? t("openNow") : t("closed");

  if (compact) {
    return (
      <span className={`flex items-center gap-1.5 text-xs ${open ? "text-success" : "text-ink-muted"}`}>
        <span className={`size-1.5 rounded-full ${open ? "bg-success" : "bg-ink-muted"}`} />
        {label}
      </span>
    );
  }

  return <Badge tone={open ? "success" : "neutral"}>{label}</Badge>;
}
