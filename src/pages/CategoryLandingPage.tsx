import { SearchX } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import JsonLd from "../components/seo/JsonLd";
import MetaTags from "../components/seo/MetaTags";
import NotFoundState from "../components/seo/NotFoundState";
import StaggerContainer, { StaggerItem } from "../components/StaggerContainer";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { useCategoryDetail } from "../hooks/useCategoryDetail";
import { useRegions } from "../hooks/useRegions";
import { useSearchBusinesses } from "../hooks/useSearchBusinesses";
import { localizedName } from "../lib/localize";
import BusinessListCard from "./search/BusinessListCard";
import LandingFilterChips from "./landing/LandingFilterChips";
import Pagination from "./search/Pagination";

const PAGE_SIZE = 20;

export default function CategoryLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  // Read straight from the URL (no wait for the district list, so one fetch).
  const rawDistrict = searchParams.get("district") ?? "";
  const districtId = /^\d+$/.test(rawDistrict) ? Number(rawDistrict) : undefined;

  const { regions } = useRegions(lang);
  const districts = regions.flatMap((r) => r.districts);

  const { category, loading: categoryLoading, notFound, error: categoryError } = useCategoryDetail(slug ?? "");
  const {
    businesses,
    meta,
    loading: businessesLoading,
    error: businessesError,
  } = useSearchBusinesses({ category: slug, district: districtId, page, limit: PAGE_SIZE, lang });

  const setDistrictFilter = (value: string) => {
    setPage(1);
    setSearchParams(value ? { district: value } : {}, { replace: true });
  };

  if (categoryLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (notFound || categoryError || !category) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <NotFoundState title={t("categoryNotFound")} body={t("categoryNotFoundBody")} noIndex={notFound} />
      </div>
    );
  }

  const name = localizedName(category, lang);
  const title = t("category.metaTitle").replace("{name}", name);
  // A filtered count is not the category's total, so the intro (and the meta
  // description, which canonicalizes to the unfiltered page) falls back to
  // the count-free wording while a district is selected.
  const description =
    !districtId && meta && meta.total > 0
      ? t("category.introWithCount").replace("{name}", name).replace("{count}", String(meta.total))
      : t("category.introEmpty").replace("{name}", name);

  return (
    <>
      <MetaTags title={title} description={description} />
      <JsonLd
        type="BreadcrumbList"
        data={{
          items: [
            { name: t("breadcrumbHome"), item: `/${lang}` },
            { name: t("categories.title"), item: `/${lang}/search` },
            { name, item: `/${lang}/category/${slug}` },
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
            {t("categories.title")}
          </Link>
          <span>/</span>
          <span className="text-ink">{name}</span>
        </nav>

        <h1 className="text-2xl font-bold text-ink">{name}</h1>
        <p className="text-sm text-ink-muted mt-2 max-w-2xl">{description}</p>

        <LandingFilterChips
          label={t("landing.filterByDistrict")}
          allLabel={t("landing.filterAll")}
          options={districts.map((d) => ({ value: String(d.id), label: localizedName(d, lang) }))}
          value={districtId ? String(districtId) : ""}
          onChange={setDistrictFilter}
        />

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
            <EmptyState icon={SearchX} title={t("category.emptyStateBody").replace("{name}", name)} body="" />
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
