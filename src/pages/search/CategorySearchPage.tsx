import { Search, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import StaggerContainer, { StaggerItem } from "../../components/StaggerContainer";
import { isOpenNow } from "../../components/business/OpenNowBadge";
import MetaTags from "../../components/seo/MetaTags";
import CuisineChips from "../../components/search/CuisineChips";
import FilterPills from "../../components/search/FilterPills";
import RestaurantCard from "../../components/search/RestaurantCard";
import SortDropdown, { type RestaurantSort } from "../../components/search/SortDropdown";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useLanguage } from "../../contexts/LanguageContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useSearchBusinesses } from "../../hooks/useSearchBusinesses";
import { comparePremiumPriority, getBusinessPremium } from "../../lib/premium";
import { getRestaurantDisplayData } from "../../lib/restaurantMock";
import Pagination from "./Pagination";
import type { Business } from "../../types";

// Fetched once per category, then filtered/sorted/paginated entirely on the
// client — filters (cuisine, price, rating, open-now) run against mocked
// fields the API doesn't expose yet, so paginating server-side would make the
// "N ta restoran topildi" count and the visible page disagree.
const FETCH_LIMIT = 100;
const PAGE_SIZE = 12;

export default function CategorySearchPage() {
  const { lang, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [cuisine, setCuisine] = useState("");
  const [price, setPrice] = useState("");
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [ratingOnly, setRatingOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [sort, setSort] = useState<RestaurantSort>("rating");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, cuisine, price, deliveryOnly, ratingOnly, openNowOnly, premiumOnly]);

  const { businesses, loading, error } = useSearchBusinesses({
    search: debouncedQuery || undefined,
    category: category || undefined,
    page: 1,
    limit: FETCH_LIMIT,
    lang,
  });

  const decorated = businesses.map((business) => ({
    business,
    mock: getRestaurantDisplayData(business),
    premium: getBusinessPremium(business),
  }));

  const filtered = decorated.filter(({ business, mock, premium }) => {
    if (cuisine && mock.cuisine !== cuisine) return false;
    if (price && mock.priceBucket !== Number(price)) return false;
    if (deliveryOnly && !business.hasDelivery) return false;
    if (ratingOnly && mock.rating < 4.5) return false;
    if (premiumOnly && premium.plan === "free") return false;
    if (openNowOnly) {
      const hours = business.primaryBranch?.hours ?? business.branches?.[0]?.hours;
      const open = isOpenNow(hours) ?? business.isOpen ?? true;
      if (!open) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Paid placement outranks the chosen sort — that is what the listing was
    // bought for — but only within it: the sort still fully orders each tier,
    // so a Featured listing can't bury a better-matching one below it.
    const byPriority = comparePremiumPriority(a.premium, b.premium);
    if (byPriority !== 0) return byPriority;
    if (sort === "rating") return b.mock.rating - a.mock.rating;
    if (sort === "price") return a.mock.priceBucket - b.mock.priceBucket;
    if (sort === "new") return b.business.id - a.business.id;
    return 0; // "nearest" — no geo distance data yet, keep API order
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems: Business[] = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((d) => d.business);

  return (
    <>
      <MetaTags
        title="Restoranlar — My Andijan"
        description="Andijon viloyatidagi restoran, kafe va oshxonalarni turkum, narx va reyting bo'yicha qidiring."
      />

      {/* top matches the fixed header height per breakpoint: MobileHeader is
          h-14, the desktop Header h-16. */}
      <div className="sticky top-14 md:top-16 z-40 bg-surface/95 backdrop-blur-xl border-b border-white/[0.06] pt-4 pb-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-3">
          <div className="max-w-3xl mx-auto w-full h-12 bg-elevated border border-white/[0.10] rounded-xl flex items-center px-4 gap-3">
            <Search size={18} className="text-ink-muted shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-muted outline-none"
            />
          </div>

          <CuisineChips value={cuisine} onChange={setCuisine} />

          <div className="flex items-center gap-2 justify-between flex-wrap">
            <FilterPills
              price={price}
              onPriceChange={setPrice}
              deliveryOnly={deliveryOnly}
              onDeliveryToggle={() => setDeliveryOnly((v) => !v)}
              ratingOnly={ratingOnly}
              onRatingToggle={() => setRatingOnly((v) => !v)}
              openNowOnly={openNowOnly}
              onOpenNowToggle={() => setOpenNowOnly((v) => !v)}
              premiumOnly={premiumOnly}
              onPremiumToggle={() => setPremiumOnly((v) => !v)}
            />
            <SortDropdown value={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-sm text-ink-muted mb-4">
          {loading ? t("common.loading") : t("restaurantsFound").replace("{count}", String(sorted.length))}
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : error || sorted.length === 0 ? (
          <EmptyState icon={SearchX} title="Hech narsa topilmadi" body="Boshqa kalit so'z yoki filtrlarni sinab ko'ring." />
        ) : (
          <>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageItems.map((business) => (
                <StaggerItem key={business.id}>
                  <RestaurantCard business={business} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
