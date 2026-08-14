import { useLanguage } from "../../contexts/LanguageContext";
import type { Business, Lang } from "../../types";

function localizedDescription(business: Business, lang: Lang): string | null {
  if (lang === "ru") return business.descriptionRu ?? null;
  if (lang === "en") return business.descriptionEn ?? null;
  return business.descriptionUz ?? null;
}

interface DescriptionSectionProps {
  business: Business;
}

export default function DescriptionSection({ business }: DescriptionSectionProps) {
  const { lang } = useLanguage();
  const description = localizedDescription(business, lang);

  if (!description) return null;

  return <p className="text-ink-body leading-relaxed mt-6">{description}</p>;
}
