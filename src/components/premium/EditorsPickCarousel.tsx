import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFeaturedBusinesses } from "../../hooks/useFeaturedBusinesses";
import { useSearchBusinesses } from "../../hooks/useSearchBusinesses";
import { comparePremiumPriority, getBusinessPremium } from "../../lib/premium";
import Skeleton from "../ui/Skeleton";
import FeaturedListingCard from "./FeaturedListingCard";

/**
 * Homepage rail of paid "Featured" placements.
 *
 * Scrolling is native overflow with scroll-snap rather than a transform-driven
 * carousel: it keeps touch/trackpad momentum, keyboard scrolling and the
 * scrollbar all working for free, and the arrows just nudge scrollLeft.
 * Renders nothing when no listing qualifies, so an empty rail never ships a
 * heading with a blank space under it.
 */
export default function EditorsPickCarousel() {
  const { lang, t } = useLanguage();
  const { businesses: featured, loading: featuredLoading } = useFeaturedBusinesses(lang);
  // /businesses/featured is empty in production — nothing has been flagged
  // featured server-side yet — so the rail falls back to the general listing
  // rather than disappearing entirely. Whichever source has rows is the one
  // premium placement is picked from.
  const { businesses: all, loading: allLoading } = useSearchBusinesses({ page: 1, limit: 24, lang });

  const source = featured.length > 0 ? featured : all;
  const loading = featured.length > 0 ? featuredLoading : featuredLoading || allLoading;
  const trackRef = useRef<HTMLDivElement>(null);

  const picks = source
    .map((business) => ({ business, premium: getBusinessPremium(business) }))
    .filter(({ premium }) => premium.isFeatured || premium.plan === "premium")
    .sort((a, b) => comparePremiumPriority(a.premium, b.premium))
    .slice(0, 8);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    // One card plus its gap — read off the DOM so it stays correct across
    // the responsive card widths below.
    const card = track.firstElementChild as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  if (!loading && picks.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Sparkles size={20} className="text-gold" />
            {t("editorsPick")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("editorsPickDesc")}</p>
        </div>

        <div className="hidden gap-2 sm:flex">
          <button
            onClick={() => scrollByCard(-1)}
            aria-label="Oldingi"
            className="flex size-9 items-center justify-center rounded-lg border border-white/[0.10] bg-card text-ink-body hover:border-gold/40 hover:text-gold"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollByCard(1)}
            aria-label="Keyingi"
            className="flex size-9 items-center justify-center rounded-lg border border-white/[0.10] bg-card text-ink-body hover:border-gold/40 hover:text-gold"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[340px] w-[290px] shrink-0 rounded-2xl sm:w-[340px]" />
            ))
          : picks.map(({ business }) => (
              <div key={business.id} className="w-[290px] shrink-0 snap-start sm:w-[340px]">
                <FeaturedListingCard business={business} showAnalytics={false} />
              </div>
            ))}
      </div>
    </section>
  );
}
