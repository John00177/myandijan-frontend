import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Navigation } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import { branchDirectionsUrl, computeMapView, mapViewKey } from "../../lib/maps";
import type { Branch } from "../../types";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Static markup only — no user text reaches this HTML (Leaflet injects divIcon
// HTML raw, so the branch name stays in the React-rendered popup instead).
const PIN_ICON = L.divIcon({
  html: '<div style="width:28px;height:28px;background:#3B82F6;border:3px solid #FFFFFF" class="rounded-full shadow-lg"></div>',
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type LocatedBranch = Branch & { lat: number; lng: number };

interface BranchMapProps {
  /** Only branches that already passed `hasCoordinates`. */
  branches: LocatedBranch[];
}

export default function BranchMap({ branches }: BranchMapProps) {
  const { lang, t } = useLanguage();
  const points = useMemo(() => branches.map((b) => [b.lat, b.lng] as [number, number]), [branches]);
  const view = useMemo(() => computeMapView(points), [points]);
  if (!view) return null;

  // One place: centre on it. Several: fit them all, never closer than street level.
  const viewProps =
    view.kind === "point"
      ? { center: view.center, zoom: view.zoom }
      : {
          bounds: L.latLngBounds(view.bounds),
          boundsOptions: { padding: [32, 32] as [number, number], maxZoom: view.maxZoom },
        };

  return (
    <MapContainer
      // The view props are read once at mount; a different business needs a new map.
      key={mapViewKey(points)}
      {...viewProps}
      // The page scrolls: a map that captures the wheel, or a one-finger swipe
      // on a phone, traps visitors in it. Touch devices keep pinch-zoom and
      // the zoom buttons, but a swipe over the map scrolls the page.
      scrollWheelZoom={false}
      dragging={!L.Browser.mobile}
      style={{ height: "100%", width: "100%", filter: "brightness(0.8) contrast(1.1)" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {branches.map((branch) => {
        const name = localizedName(branch, lang);
        const directions = branchDirectionsUrl(branch);
        return (
          // `title` names the pin for assistive technology and on hover.
          <Marker key={branch.id} position={[branch.lat, branch.lng]} icon={PIN_ICON} title={name} alt={name}>
            <Popup>
              <div className="min-w-[160px]">
                <div className="font-semibold text-ink text-sm">{name}</div>
                {branch.address && <div className="text-xs text-ink-muted mt-1">{branch.address}</div>}
                {directions && (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary mt-2"
                  >
                    <Navigation size={12} />
                    {t("directions")}
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
