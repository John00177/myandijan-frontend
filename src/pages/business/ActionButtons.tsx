import { Heart, Navigation, Phone, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { addFavorite, ApiError, getFavorites, recordBusinessClick, removeFavorite } from "../../lib/api";
import type { Business } from "../../types";

interface ActionButtonsProps {
  business: Business;
}

function directionsUrl(business: Business): string | null {
  const branch = business.primaryBranch ?? business.branches?.[0] ?? null;
  if (branch?.lat != null && branch?.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
  }
  const address = business.address ?? branch?.address;
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  return null;
}

export default function ActionButtons({ business }: ActionButtonsProps) {
  const { token, openAuthModal } = useAuth();
  const { t } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    getFavorites()
      .then((favorites) => {
        if (!cancelled) setIsFavorite(favorites.some((f) => f.id === business.id));
      })
      .catch(() => {
        // Not critical to the page — the heart just starts unfilled.
      });
    return () => {
      cancelled = true;
    };
  }, [token, business.id]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  async function toggleFavorite() {
    if (!token) {
      openAuthModal();
      return;
    }
    setFavoritePending(true);
    try {
      if (isFavorite) {
        await removeFavorite(business.id);
        setIsFavorite(false);
        setToast(t("removedFromFavorites"));
      } else {
        await addFavorite(business.id);
        setIsFavorite(true);
        setToast(t("addedToFavorites"));
        recordBusinessClick(business.id, "FAVORITE");
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : t("common.genericError"));
    } finally {
      setFavoritePending(false);
    }
  }

  async function share() {
    recordBusinessClick(business.id, "SHARE");
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: business.nameUz, url });
      } catch {
        // User cancelled the share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast(t("linkCopied"));
    } catch {
      setToast(url);
    }
  }

  const mapsUrl = directionsUrl(business);

  return (
    <div className="relative">
      {toast && (
        <div className="absolute -top-11 left-0 right-0 mx-auto w-fit max-w-full px-3 py-1.5 rounded-lg bg-card border border-white/[0.10] text-xs text-ink shadow-lg z-10">
          {toast}
        </div>
      )}
      <div className="grid grid-cols-4 gap-3 mt-6">
        <a
          href={business.phone ? `tel:${business.phone}` : undefined}
          aria-disabled={!business.phone}
          onClick={() => business.phone && recordBusinessClick(business.id, "CALL")}
          className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 ${
            business.phone
              ? "bg-primary text-white"
              : "bg-white/[0.05] border border-white/[0.10] text-ink-muted pointer-events-none opacity-50"
          }`}
        >
          <Phone size={18} />
          <span className="text-xs font-medium">{t("common.call")}</span>
        </a>

        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => recordBusinessClick(business.id, "DIRECTION")}
            className="bg-white/[0.05] border border-white/[0.10] text-ink h-14 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary/30"
          >
            <Navigation size={18} />
            <span className="text-xs font-medium">{t("directions")}</span>
          </a>
        ) : (
          <button
            disabled
            className="bg-white/[0.05] border border-white/[0.10] text-ink-muted h-14 rounded-xl flex flex-col items-center justify-center gap-1 opacity-50"
          >
            <Navigation size={18} />
            <span className="text-xs font-medium">{t("directions")}</span>
          </button>
        )}

        <button
          onClick={share}
          className="bg-white/[0.05] border border-white/[0.10] text-ink h-14 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary/30"
        >
          <Share2 size={18} />
          <span className="text-xs font-medium">{t("share")}</span>
        </button>

        <button
          onClick={toggleFavorite}
          disabled={favoritePending}
          className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 border transition-colors ${
            isFavorite
              ? "bg-danger/10 border-danger/30 text-danger"
              : "bg-white/[0.05] border-white/[0.10] text-ink hover:border-primary/30"
          }`}
        >
          <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
          <span className="text-xs font-medium">{t("common.favorite")}</span>
        </button>
      </div>
    </div>
  );
}
