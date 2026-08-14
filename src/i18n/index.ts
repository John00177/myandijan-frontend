import en from "./en";
import ru from "./ru";
import uz from "./uz";
import type { Lang } from "../types";

export type TranslationKey = keyof typeof uz;

export const dictionaries: Record<Lang, Record<TranslationKey, string>> = {
  uz,
  ru,
  en,
};
