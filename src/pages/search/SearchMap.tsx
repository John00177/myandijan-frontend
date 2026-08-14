import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import Badge from "../../components/ui/Badge";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import type { Business, Lang } from "../../types";

const ANDIJON_CENTER: [number, number] = [40.7823, 72.3442];
const DEFAULT_ZOOM = 10;
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface PinnedBusiness {
  business: Business;
  lat: number;
  lng: number;
}

function markerIcon(label: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="size-8 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">${label}</div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function pinBusinesses(businesses: Business[]): PinnedBusiness[] {
  const pinned: PinnedBusiness[] = [];
  for (const business of businesses) {
    const lat = business.primaryBranch?.lat;
    const lng = business.primaryBranch?.lng;
    if (typeof lat === "number" && typeof lng === "number") {
      pinned.push({ business, lat, lng });
    }
  }
  return pinned;
}

function BusinessPopup({ business, lang }: { business: Business; lang: Lang }) {
  return (
    <div className="min-w-[180px]">
      <div className="font-semibold text-ink text-sm">{localizedName(business, lang)}</div>
      <div className="flex items-center gap-2 mt-1.5">
        {business.category && <Badge tone="cyan">{localizedName(business.category, lang)}</Badge>}
        <span className="flex items-center gap-1 text-xs text-warning font-semibold">
          <Star size={12} className="fill-warning" />
          {business.rating ?? "—"}
        </span>
      </div>
      <Link to={`/${lang}/business/${business.slug}`} className="text-xs text-primary hover:text-blue-300 mt-2 block">
        Ko'rish →
      </Link>
    </div>
  );
}

interface SearchMapProps {
  businesses: Business[];
}

export default function SearchMap({ businesses }: SearchMapProps) {
  const { lang } = useLanguage();
  const pins = useMemo(() => pinBusinesses(businesses), [businesses]);

  return (
    <div className="hidden lg:block sticky top-24 h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-white/[0.06] relative">
      <MapContainer
        center={ANDIJON_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", filter: "brightness(0.8) contrast(1.1)" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {pins.map(({ business, lat, lng }) => (
          <Marker key={business.id} position={[lat, lng]} icon={markerIcon(localizedName(business, lang)[0] ?? "?")}>
            <Popup>
              <BusinessPopup business={business} lang={lang} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {pins.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-surface/95 backdrop-blur-xl border border-white/[0.10] rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-card pointer-events-none">
          <MapPin size={16} className="text-primary/70 shrink-0" />
          <span className="text-xs text-ink-body">Bizneslar koordinatalari tez orada qo'shiladi</span>
        </div>
      )}
    </div>
  );
}
