import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import JsonLd, { type LocalBusinessInput } from "../components/seo/JsonLd";
import MetaTags from "../components/seo/MetaTags";
import NotFoundState from "../components/seo/NotFoundState";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useBusiness } from "../hooks/useBusiness";
import { localizedDescription, localizedName } from "../lib/localize";
import { ownsBusiness } from "../lib/ownership";
import { localBusinessSchemaType, localizedMetaOverride, metaDescription, sameAsLinks } from "../lib/seo";
import ActionButtons from "./business/ActionButtons";
import BranchesSection from "./business/BranchesSection";
import BusinessInfoHeader from "./business/BusinessInfoHeader";
import ClaimBusinessSection from "./business/ClaimBusinessSection";
import ContactCTA from "./business/ContactCTA";
import DescriptionSection from "./business/DescriptionSection";
import HeroImage from "./business/HeroImage";
import MenuSection from "./business/MenuSection";
import ReviewsSection from "./business/ReviewsSection";
import SimilarBusinesses from "./business/SimilarBusinesses";
import SocialLinks from "../components/business/SocialLinks";

type DetailTab = "about" | "menu" | "reviews";

export default function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const { user, can } = useAuth();
  const { business, loading, notFound, error, reload } = useBusiness(slug ?? "", lang, user);
  const [activeTab, setActiveTab] = useState<DetailTab>("about");

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  // A transient failure (network, 5xx) is not a missing business: say so and
  // offer a retry, with no head tags (see NotFoundState).
  if (error && !notFound) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <EmptyState
          icon={AlertTriangle}
          title={t("common.genericError")}
          body=""
          actionLabel={t("common.retry")}
          onAction={reload}
        />
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <NotFoundState title={t("businessNotFound")} body={t("businessNotFoundBody")} noIndex={notFound} />
      </div>
    );
  }

  const image = business.coverPhoto ?? business.coverImageUrl;
  const name = localizedName(business, lang);
  const description =
    localizedDescription(business, lang) ?? t("business.defaultDescription").replace("{name}", name);
  // The owner's SEO overrides win; otherwise the page's own text, cut to snippet length.
  const metaTitle = localizedMetaOverride(business, "metaTitle", lang) ?? `${name} — My Andijan`;
  const metaDesc = localizedMetaOverride(business, "metaDescription", lang) ?? metaDescription(description);
  const pageUrl = `/${lang}/business/${business.slug}`;

  // Coordinates and opening hours live on the primary branch, not the business.
  const branch = business.primaryBranch ?? business.branches?.[0] ?? null;
  const locality = business.city ? localizedName(business.city, lang) : business.district ? localizedName(business.district, lang) : null;

  // Home › Category › District › Business — each crumb only when its landing
  // page exists (a district without a slug has none).
  const breadcrumbs = [
    { name: t("breadcrumbHome"), item: `/${lang}` },
    ...(business.category
      ? [{ name: localizedName(business.category, lang), item: `/${lang}/category/${business.category.slug}` }]
      : []),
    ...(business.district?.slug
      ? [{ name: localizedName(business.district, lang), item: `/${lang}/district/${business.district.slug}` }]
      : []),
    { name, item: pageUrl },
  ];

  // Catalog management on the public page is the owner's alone (Phase 15B,
  // D-74); staff edit through the admin panel. Server-enforced as well.
  const canManage = ownsBusiness(user, business.ownerId) && can("business.manage_own");

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "about", label: t("description") },
    { key: "menu", label: t("menu") },
    { key: "reviews", label: `${t("reviews")}${business.reviewCount ? ` (${business.reviewCount})` : ""}` },
  ];

  const schema: LocalBusinessInput = {
    schemaType: localBusinessSchemaType(business.category?.slug),
    name,
    description: metaDesc,
    image,
    url: pageUrl,
    telephone: business.phone,
    address: { addressLocality: locality, streetAddress: business.address },
    geo: branch?.lat != null && branch.lng != null ? { lat: branch.lat, lng: branch.lng } : null,
    openingHours: branch?.hours,
    ratingValue: business.rating,
    reviewCount: business.reviewCount,
    sameAs: sameAsLinks(business.website, business.instagram, business.telegram),
  };

  return (
    <>
      <MetaTags title={metaTitle} description={metaDesc} image={image} type="article" />
      <JsonLd type="LocalBusiness" data={schema} />
      <JsonLd type="BreadcrumbList" data={{ items: breadcrumbs }} />

      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-6 pt-4">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.item} className="flex items-center gap-2 min-w-0">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link to={crumb.item} className="hover:text-ink">
                  {crumb.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink truncate max-w-[60vw]">
                  {crumb.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <HeroImage imageUrl={image} />

      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-10">
        <div className="rounded-2xl bg-card border border-white/[0.08] shadow-card p-6 md:p-8">
          <BusinessInfoHeader business={business} onViewReviews={() => setActiveTab("reviews")} />
          <ContactCTA business={business} />
          <ActionButtons business={business} />
          <ClaimBusinessSection business={business} />
          {(business.instagram || business.telegram || business.website) && (
            <div className="mt-6">
              <SocialLinks instagram={business.instagram} telegram={business.telegram} website={business.website} />
            </div>
          )}
          <div className="flex items-center gap-1 mt-8 border-b border-white/[0.08]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "about" && (
              <>
                <DescriptionSection business={business} />
                <BranchesSection branches={business.branches} />
              </>
            )}
            {activeTab === "menu" && <MenuSection businessId={business.id} canManage={canManage} />}
            {activeTab === "reviews" && (
              <ReviewsSection
                businessId={business.id}
                ownerId={business.ownerId}
                reviews={business.reviews}
                onChanged={reload}
              />
            )}
          </div>

          <SimilarBusinesses businesses={business.similar} />
        </div>
      </div>
    </>
  );
}
