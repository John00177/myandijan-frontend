import { SearchX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import JsonLd from "../components/seo/JsonLd";
import MetaTags from "../components/seo/MetaTags";
import StaggerContainer, { StaggerItem } from "../components/StaggerContainer";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { useCategoryDetail } from "../hooks/useCategoryDetail";
import { useSearchBusinesses } from "../hooks/useSearchBusinesses";
import { localizedName } from "../lib/localize";
import BusinessListCard from "./search/BusinessListCard";
import Pagination from "./search/Pagination";

const PAGE_SIZE = 20;

export default function CategoryLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const [page, setPage] = useState(1);

  const { category, loading: categoryLoading, notFound, error: categoryError } = useCategoryDetail(slug ?? "");
  const {
    businesses,
    meta,
    loading: businessesLoading,
    error: businessesError,
  } = useSearchBusinesses({ category: slug, page, limit: PAGE_SIZE, lang });

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
        <EmptyState icon={SearchX} title={t("categoryNotFound")} body={t("categoryNotFoundBody")} />
      </div>
    );
  }

  const name = localizedName(category, lang);
  const title = t("category.metaTitle").replace("{name}", name);
  const description =
    meta && meta.total > 0
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
