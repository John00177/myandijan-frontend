import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";
import { useRegions } from "../../hooks/useRegions";
import { localizedName } from "../../lib/localize";
import { toE164 } from "../../lib/phone";
import BusinessInfoHeader from "../../pages/business/BusinessInfoHeader";
import HeroImage from "../../pages/business/HeroImage";
import type { ClaimFormData } from "../../hooks/useClaimFlow";
import type { Business, Category, District } from "../../types";

interface BusinessPreviewProps {
  form: ClaimFormData;
}

/**
 * Live preview of the page being created, driven entirely by form state.
 *
 * It composes the real detail-page pieces — HeroImage and BusinessInfoHeader —
 * rather than rendering BusinessDetailPage itself. That page takes no props:
 * it reads the slug from the router and fetches, and its remaining sections
 * (reviews, menu, similar businesses, favourites) each fetch by business id
 * too. Pointing it at a business that does not exist yet would fire a burst of
 * requests and render not-found states. The two components below are pure and
 * null-safe, so they show the owner the genuine article as they type.
 */
function toPreviewBusiness(form: ClaimFormData, category: Category | null, district: District | null): Business {
  const name = form.name.trim();
  return {
    // Placeholder identifiers: nothing in the preview navigates or fetches.
    id: 0,
    slug: "preview",
    nameUz: name,
    nameRu: name,
    nameEn: name,
    phone: form.phone ? toE164(form.phone) : null,
    address: form.address.trim() || null,
    website: form.website.trim() || null,
    category,
    district,
    // A brand-new listing genuinely has no reviews; showing "—" and 0 is the
    // honest preview, not an empty state to be filled with sample numbers.
    rating: null,
    reviewCount: 0,
    verified: false,
    branches: [],
    primaryBranch: null,
  };
}

export default function BusinessPreview({ form }: BusinessPreviewProps) {
  const { lang, t } = useLanguage();
  const { categories } = useCategories(lang);
  const { regions } = useRegions(lang);

  const category = categories.find((c) => String(c.id) === form.categoryId) ?? null;
  const district = regions[0]?.districts.find((d) => String(d.id) === form.districtId) ?? null;
  const business = toPreviewBusiness(form, category, district);

  const hasAnything = form.name.trim().length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
      <div className="border-b border-white/[0.06] px-4 py-2.5">
        <span className="text-[11px] uppercase tracking-wider text-ink-muted">{t("claim.previewLabel")}</span>
      </div>

      {hasAnything ? (
        <>
          <HeroImage imageUrl={null} />

          <div className="p-5">
            <BusinessInfoHeader business={business} />

            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              {form.address.trim() && (
                <span className="flex items-start gap-2 text-ink-body">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-ink-muted" />
                  {[form.address.trim(), district ? localizedName(district, lang) : null]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
              {form.phone && (
                <span className="flex items-center gap-2 text-ink-body">
                  <Phone size={15} className="shrink-0 text-ink-muted" />
                  {toE164(form.phone, { pretty: true })}
                </span>
              )}
              {form.email.trim() && (
                <span className="flex items-center gap-2 text-ink-muted">
                  <Mail size={15} className="shrink-0" />
                  {/* Shown greyed with a note because the owner was told it
                      stays private — the preview has to agree with that promise. */}
                  {form.email.trim()}
                  <span className="text-xs">({t("claim.emailPrivateShort")})</span>
                </span>
              )}
              {form.website.trim() && (
                <span className="flex items-center gap-2 text-ink-body">
                  <Globe size={15} className="shrink-0 text-ink-muted" />
                  {form.website.trim()}
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-[260px] flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-ink-muted">{t("claim.previewEmpty")}</p>
        </div>
      )}
    </div>
  );
}
