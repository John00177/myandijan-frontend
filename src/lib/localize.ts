import type { Lang } from "../types";

interface LocalizedNames {
  nameUz: string;
  nameRu: string;
  nameEn: string;
}

export function localizedName(entity: LocalizedNames, lang: Lang): string {
  if (lang === "ru") return entity.nameRu;
  if (lang === "en") return entity.nameEn;
  return entity.nameUz;
}

interface LocalizedDescriptions {
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
}

/**
 * Description in the requested language, falling back through the other two.
 *
 * Meta descriptions are worse than useless when empty, so a listing that only
 * filled in one language still gets that text rather than a blank tag.
 */
export function localizedDescription(entity: LocalizedDescriptions, lang: Lang): string | null {
  const ordered =
    lang === "ru"
      ? [entity.descriptionRu, entity.descriptionUz, entity.descriptionEn]
      : lang === "en"
        ? [entity.descriptionEn, entity.descriptionUz, entity.descriptionRu]
        : [entity.descriptionUz, entity.descriptionRu, entity.descriptionEn];

  return ordered.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
}
