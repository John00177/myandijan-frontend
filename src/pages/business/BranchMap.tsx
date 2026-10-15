import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Navigation } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import { branchDirectionsUrl } from "../../lib/maps";
import type { Branch } from "../../types";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const SINGLE_BRANCH_ZOOM = 16;

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

  // One branch: centre on it, close in. Several: fit them all in view.
  const view =
    points.length === 1
      ? { center: points[0], zoom: SINGLE_BRANCH_ZOOM }
      : { bounds: L.latLngBounds(points), boundsOptions: { padding: [32, 32] as [number, number] } };

  return (
    <MapContainer
      {...view}
      // The page scrolls; a map that captures the wheel traps visitors in it.
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", filter: "brightness(0.8) contrast(1.1)" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {branches.map((branch) => {
        const directions = branchDirectionsUrl(branch);
        return (
          <Marker key={branch.id} position={[branch.lat, branch.lng]} icon={PIN_ICON}>
            <Popup>
              <div className="min-w-[160px]">
                <div className="font-semibold text-ink text-sm">{localizedName(branch, lang)}</div>
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
