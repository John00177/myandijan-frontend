import { SearchX } from "lucide-react";
import { useParams } from "react-router-dom";
import JsonLd, { type LocalBusinessInput } from "../components/seo/JsonLd";
import MetaTags from "../components/seo/MetaTags";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { useBusiness } from "../hooks/useBusiness";
import { localizedDescription, localizedName } from "../lib/localize";
import ActionButtons from "./business/ActionButtons";
import BranchesSection from "./business/BranchesSection";
import BusinessInfoHeader from "./business/BusinessInfoHeader";
import DescriptionSection from "./business/DescriptionSection";
import HeroImage from "./business/HeroImage";
import ReviewsSection from "./business/ReviewsSection";
import SimilarBusinesses from "./business/SimilarBusinesses";

export default function BusinessDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const { business, loading, notFound, error } = useBusiness(slug ?? "", lang);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (notFound || error || !business) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <EmptyState
          icon={SearchX}
          title="Biznes topilmadi"
          body="Bu biznes mavjud emas yoki o'chirilgan bo'lishi mumkin."
        />
      </div>
    );
  }

  const image = business.coverPhoto ?? business.coverImageUrl;
  const name = localizedName(business, lang);
  const description =
    localizedDescription(business, lang) ??
    `${name} — Andijon viloyatidagi biznes. Manzil, telefon raqami va ish vaqti.`;

  // Coordinates and opening hours live on the primary branch, not the business.
  const branch = business.primaryBranch ?? business.branches?.[0] ?? null;
  const locality = business.city ? localizedName(business.city, lang) : business.district ? localizedName(business.district, lang) : null;

  const schema: LocalBusinessInput = {
    name,
    description,
    image,
    url: `/${lang}/business/${business.slug}`,
    telephone: business.phone,
    address: { addressLocality: locality, streetAddress: business.address },
    geo: branch?.lat != null && branch.lng != null ? { lat: branch.lat, lng: branch.lng } : null,
    openingHours: branch?.hours,
    ratingValue: business.rating,
    reviewCount: business.reviewCount,
  };

  return (
    <>
      <MetaTags title={`${name} — My Andijan`} description={description} image={image} type="article" />
      <JsonLd type="LocalBusiness" data={schema} />
      <JsonLd
        type="BreadcrumbList"
        data={{
          items: [
            { name: "My Andijan", item: `/${lang}` },
            { name: t("search.button"), item: `/${lang}/search` },
            { name, item: `/${lang}/business/${business.slug}` },
          ],
        }}
      />

      <HeroImage imageUrl={image} />

      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-10">
        <div className="rounded-2xl bg-card border border-white/[0.08] shadow-card p-6 md:p-8">
          <BusinessInfoHeader business={business} />
          <ActionButtons business={business} />
          <DescriptionSection business={business} />
          <BranchesSection branches={business.branches} />
          <ReviewsSection reviews={business.reviews} />
          <SimilarBusinesses businesses={business.similar} />
        </div>
      </div>
    </>
  );
}
