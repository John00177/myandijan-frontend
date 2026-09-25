import { ChevronLeft, ChevronRight, Eye, ImageIcon, MapPin, Star, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import { getBusinessPremium } from "../../lib/premium";
import PremiumBadge, { TopRatedBadge } from "./PremiumBadge";
import Sparkline from "./Sparkline";
import type { Business } from "../../types";

interface FeaturedListingCardProps {
  business: Business;
  /** Extra gallery images; the cover photo is always used as the first slide. */
  images?: string[];
  /** Hides the owner-facing analytics strip on public surfaces. */
  showAnalytics?: boolean;
}

/**
 * The paid "Featured" placement: larger than a normal result, gold-bordered,
 * ribboned, and carrying a small performance readout for the owner.
 *
 * The gold border is a gradient-filled wrapper with the card inset by 1px
 * rather than a `border-image` — border-image doesn't follow border-radius in
 * Safari, which would square off the corners on iOS.
 */
export default function FeaturedListingCard({
  business,
  images = [],
  showAnalytics = true,
}: FeaturedListingCardProps) {
  const { lang } = useLanguage();
  const premium = getBusinessPremium(business);

  const cover = business.coverPhoto ?? business.coverImageUrl ?? null;
  const slides = [cover, ...images].filter((src): src is string => !!src);
  const [slide, setSlide] = useState(0);
  const activeSlide = slides.length > 0 ? slides[slide % slides.length] : null;

  function step(direction: 1 | -1) {
    setSlide((prev) => (prev + direction + slides.length) % slides.length);
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold via-[#FFB300] to-gold-deep p-[1.5px] shadow-[0_10px_40px_-16px_rgba(255,215,0,0.45)]">
      <div className="relative rounded-[15px] bg-card overflow-hidden">
        {/* Ribbon. Rotated out of flow so it reads as an overlay on the photo
            rather than pushing the image down. Only a genuinely Featured
            listing gets it — this card is also used for Premium placements,
            and labelling those "Featured" would misrepresent what was paid for. */}
        {premium.isFeatured && (
          <div className="pointer-events-none absolute -right-9 top-4 z-20 w-32 rotate-45 bg-gradient-to-r from-gold to-[#FFB300] py-1 text-center text-[10px] font-bold uppercase tracking-wider text-[#3A2B00] shadow-lg">
            Featured
          </div>
        )}

        <div className="relative h-44 sm:h-52 bg-gradient-to-br from-[#1F2C38] to-[#121A22]">
          {activeSlide ? (
            <img src={activeSlide} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-muted/30">
              <ImageIcon size={30} />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />

          {/* The corner ribbon already says "Featured", so the overlay badge
              only carries what it doesn't: the Premium tier for a listing shown
              in this card without being Featured, plus the Top Rated flame. */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            {!premium.isFeatured && premium.plan === "premium" && <PremiumBadge variant="premium" />}
            {premium.isTopRated && <TopRatedBadge />}
          </div>

          {premium.priorityRank != null && (
            <span
              className="absolute right-3 top-3 flex items-center gap-1 rounded-badge bg-black/60 px-2 py-[3px] text-[10px] font-bold text-gold backdrop-blur-sm"
              title="Ustuvorlik o'rni · Приоритет"
            >
              <TrendingUp size={11} />#{premium.priorityRank}
            </span>
          )}

          {slides.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Oldingi rasm"
                onClick={() => step(-1)}
                className="absolute left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Keyingi rasm"
                onClick={() => step(1)}
                className="absolute right-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {slides.map((src, i) => (
                  <span
                    key={src}
                    className={`size-1.5 rounded-full transition-colors ${
                      i === slide % slides.length ? "bg-gold" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/${lang}/business/${business.slug}`} className="min-w-0">
              <h3 className="truncate text-lg font-bold text-ink hover:text-gold">{localizedName(business, lang)}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                {business.category && <span className="truncate">{localizedName(business.category, lang)}</span>}
                {business.district && (
                  <span className="flex shrink-0 items-center gap-1">
                    <MapPin size={11} />
                    {localizedName(business.district, lang)}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-warning/10 px-2 py-1">
              <Star size={13} className="fill-warning text-warning" />
              <span className="text-sm font-bold text-warning">{business.rating ?? "—"}</span>
              <span className="text-[11px] text-ink-muted">({business.reviewCount ?? 0})</span>
            </div>
          </div>

          {showAnalytics && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <Eye size={13} className="text-gold" />
                  {premium.totalViews.toLocaleString("ru-RU")}
                </div>
                <div className="truncate text-[10px] uppercase tracking-wider text-ink-muted">
                  Hafta · Неделя
                </div>
              </div>
              <Sparkline values={premium.weeklyViews} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
