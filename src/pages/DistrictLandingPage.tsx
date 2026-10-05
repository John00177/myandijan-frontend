import { SearchX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import JsonLd from "../components/seo/JsonLd";
import MetaTags from "../components/seo/MetaTags";
import NotFoundState from "../components/seo/NotFoundState";
import StaggerContainer, { StaggerItem } from "../components/StaggerContainer";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { useRegions } from "../hooks/useRegions";
import { useSearchBusinesses } from "../hooks/useSearchBusinesses";
import { localizedName } from "../lib/localize";
import BusinessListCard from "./search/BusinessListCard";
import Pagination from "./search/Pagination";

const PAGE_SIZE = 20;

export default function DistrictLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const [page, setPage] = useState(1);

  // Only ~14 districts exist total, all already fetched (nested under regions)
  // for the search filters and DistrictsSection — no dedicated
  // GET /geography/districts/:slug endpoint exists, and adding one for a
  // dataset this small would be a needless round trip.
  const { regions, loading: regionsLoading, error: regionsError } = useRegions(lang);
  const district = regions.flatMap((r) => r.districts).find((d) => d.slug === slug) ?? null;

  const {
    businesses,
    meta,
    loading: businessesLoading,
    error: businessesError,
  } = useSearchBusinesses({ district: district?.id, page, limit: PAGE_SIZE, lang });

  if (regionsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (regionsError || !district) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Confirmed only when the district list loaded and the slug matched
            nothing; a failed load (regionsError) may hide a real district. */}
        <NotFoundState title={t("districtNotFound")} body={t("districtNotFoundBody")} noIndex={!regionsError} />
      </div>
    );
  }

  const name = localizedName(district, lang);
  const title = t("district.metaTitle").replace("{name}", name);
  const description =
    meta && meta.total > 0
      ? t("district.introWithCount").replace("{name}", name).replace("{count}", String(meta.total))
      : t("district.introEmpty").replace("{name}", name);

  return (
    <>
      <MetaTags title={title} description={description} />
      <JsonLd
        type="BreadcrumbList"
        data={{
          items: [
            { name: t("breadcrumbHome"), item: `/${lang}` },
            { name: t("districts.title"), item: `/${lang}/search` },
            { name, item: `/${lang}/district/${slug}` },
          ],
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <nav className="text-sm text-ink-muted mb-4 flex items-center gap-2">
          <Link to={`/${lang}`} className="hover:text-ink">
            {t("breadcrumbHome")}
          </Link>
          <span>/</span>
          <Link to={`/${lang}/search`} className="hover:text-ink">
            {t("districts.title")}
          </Link>
          <span>/</span>
          <span className="text-ink">{name}</span>
        </nav>

        <h1 className="text-2xl font-bold text-ink">{name}</h1>
        <p className="text-sm text-ink-muted mt-2 max-w-2xl">{description}</p>

        <div className="mt-8">
          {businessesLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[144px]" />
              ))}
            </div>
          ) : businessesError ? (
            <EmptyState icon={SearchX} title={t("common.genericError")} body="" />
          ) : businesses.length === 0 ? (
            <EmptyState icon={SearchX} title={t("district.emptyStateBody").replace("{name}", name)} body="" />
          ) : (
            <StaggerContainer className="flex flex-col gap-4">
              {businesses.map((business) => (
                <StaggerItem key={business.id}>
                  <BusinessListCard business={business} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          {meta && meta.totalPages > 1 && (
            <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
          )}
        </div>
      </div>
    </>
  );
}
