import type { TranslationKey } from "../../../i18n";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface WorkingHourRow {
  day: DayKey;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface BusinessFormData {
  name: string;
  categoryId: string;
  description: string;
  phone: string;
  secondaryPhone: string;
  coverPhoto: File | null;
  districtId: string;
  cityId: string;
  address: string;
  landmark: string;
  mapUrl: string;
  email: string;
  telegram: string;
  instagram: string;
  website: string;
  workingHours: WorkingHourRow[];
}

export type FormStep = 1 | 2 | 3;

export type FormErrors = Partial<Record<keyof BusinessFormData, string>>;

/** Sunday defaults to closed; every other day defaults to a 09:00–18:00 shift. */
export const DEFAULT_WORKING_HOURS: WorkingHourRow[] = [
  { day: "mon", open: "09:00", close: "18:00", isClosed: false },
  { day: "tue", open: "09:00", close: "18:00", isClosed: false },
  { day: "wed", open: "09:00", close: "18:00", isClosed: false },
  { day: "thu", open: "09:00", close: "18:00", isClosed: false },
  { day: "fri", open: "09:00", close: "18:00", isClosed: false },
  { day: "sat", open: "09:00", close: "18:00", isClosed: false },
  { day: "sun", open: "09:00", close: "18:00", isClosed: true },
];

export const DAY_LABEL_KEYS: Record<DayKey, TranslationKey> = {
  mon: "days.mon",
  tue: "days.tue",
  wed: "days.wed",
  thu: "days.thu",
  fri: "days.fri",
  sat: "days.sat",
  sun: "days.sun",
};

/** 0 = Monday … 6 = Sunday, matching the `BusinessHours.day` convention used elsewhere in the app. */
export const DAY_TO_INDEX: Record<DayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

export function emptyFormData(): BusinessFormData {
  return {
    name: "",
    categoryId: "",
    description: "",
    phone: "+998",
    secondaryPhone: "",
    coverPhoto: null,
    districtId: "",
    cityId: "",
    address: "",
    landmark: "",
    mapUrl: "",
    email: "",
    telegram: "",
    instagram: "",
    website: "",
    workingHours: DEFAULT_WORKING_HOURS,
  };
}
