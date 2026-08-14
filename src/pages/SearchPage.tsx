import { SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState";
import MetaTags from "../components/seo/MetaTags";
import StaggerContainer, { StaggerItem } from "../components/StaggerContainer";
import Skeleton from "../components/ui/Skeleton";
import { useLanguage } from "../contexts/LanguageContext";
import { useCategories } from "../hooks/useCategories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useRegions } from "../hooks/useRegions";
import { useSearchBusinesses } from "../hooks/useSearchBusinesses";
import BusinessListCard from "./search/BusinessListCard";
import Pagination from "./search/Pagination";
import SearchMap from "./search/SearchMap";
import SearchHeader, { type SortOption } from "./search/SearchHeader";
import type { Business } from "../types";

const PAGE_SIZE = 20;

function sortBusinesses(businesses: Business[], sort: SortOption, lang: "uz" | "ru" | "en"): Business[] {
  if (sort === "rating") {
    return [...businesses].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }
  if (sort === "name") {
    const nameOf = (b: Business) => (lang === "ru" ? b.nameRu : lang === "en" ? b.nameEn : b.nameUz);
    return [...businesses].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }
  return businesses;
}

export default function SearchPage() {
  const { lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debouncedQuery = useDebouncedValue(query, 300);

  const category = searchParams.get("category") ?? "";
  const district = searchParams.get("district") ?? "";
  const city = searchParams.get("city") ?? "";
  const sort = (searchParams.get("sort") as SortOption | null) ?? "default";
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debouncedQuery) next.set("q", debouncedQuery);
        else next.delete("q");
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedQuery, setSearchParams]);

  function updateParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function goToPage(nextPage: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(nextPage));
        return next;
      },
      { replace: true },
    );
  }

  const { categories } = useCategories(lang);
  const { regions } = useRegions(lang);
  const districts = regions[0]?.districts ?? [];
  const cities = useMemo(() => {
    if (district) {
      return districts.find((d) => String(d.id) === district)?.cities ?? [];
    }
    return districts.flatMap((d) => d.cities);
  }, [districts, district]);

  const { businesses, meta, loading, error } = useSearchBusinesses({
    search: debouncedQuery || undefined,
    category: category || undefined,
    district: district ? Number(district) : undefined,
    city: city ? Number(city) : undefined,
    page,
    limit: PAGE_SIZE,
    lang,
  });

  const sortedBusinesses = sortBusinesses(businesses, sort, lang);

  return (
    <>
      <MetaTags
        title={query ? `${query} — Qidiruv natijalari — My Andijan` : "Qidiruv natijalari — My Andijan"}
        description={
          query
            ? `"${query}" bo'yicha Andijon viloyatidagi qidiruv natijalari.`
            : "Andijon viloyatidagi bizneslarni turkum, tuman va shahar bo'yicha qidiring."
        }
      />

      <SearchHeader
        lang={lang}
        query={query}
        onQueryChange={setQuery}
        onSubmit={() => setSearchParams((prev) => new URLSearchParams(prev), { replace: true })}
        categories={categories}
        categoryValue={category}
        onCategoryChange={(v) => updateParam("category", v)}
        districts={districts}
        districtValue={district}
        onDistrictChange={(v) => {
          updateParam("district", v);
          updateParam("city", "");
        }}
        cities={cities}
        cityValue={city}
        onCityChange={(v) => updateParam("city", v)}
        sortValue={sort}
        onSortChange={(v) => updateParam("sort", v === "default" ? "" : v)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-ink-muted mb-4">
          {loading ? "Qidirilmoqda..." : `${meta?.total ?? 0} ta natija topildi`}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div>
            {loading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[144px]" />
                ))}
              </div>
            ) : error || sortedBusinesses.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title="Hech narsa topilmadi"
                body="Boshqa kalit so'z yoki filtrlarni sinab ko'ring."
              />
            ) : (
              <StaggerContainer className="flex flex-col gap-4">
                {sortedBusinesses.map((business) => (
                  <StaggerItem key={business.id}>
                    <BusinessListCard business={business} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            {meta && <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={goToPage} />}
          </div>

          <SearchMap businesses={sortedBusinesses} />
        </div>
      </div>
    </>
  );
}
