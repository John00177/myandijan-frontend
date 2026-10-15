import type { Branch } from "../types";

/**
 * A coordinate worth drawing: both values finite and in range, and not exactly
 * (0, 0) — "null island", which a missing value that was coerced with Number()
 * decays to. Branch coordinates are optional all the way down (a branch with
 * only an address is normal), so every map feature asks this first.
 */
export function hasCoordinates(branch: Branch): branch is Branch & { lat: number; lng: number } {
  const { lat, lng } = branch;
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Where "Yo'nalish" (directions) should take the visitor for one branch:
 * Google Maps with that branch as the destination — its coordinates when it
 * has them, otherwise its address (URL-encoded; addresses are user-submitted).
 * `null` when the branch has neither, so the caller renders no link at all.
 */
export function branchDirectionsUrl(branch: Branch): string | null {
  if (hasCoordinates(branch)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${branch.lat.toFixed(6)},${branch.lng.toFixed(6)}`;
  }
  const address = branch.address?.trim();
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return null;
}

export type MapView =
  | { kind: "point"; center: [number, number]; zoom: number }
  | { kind: "bounds"; bounds: [[number, number], [number, number]]; maxZoom: number };

/** How close a street-level view of one place is; also the cap when fitting several. */
const POINT_ZOOM = 16;

/** Branches closer than this (in degrees, roughly 55 m) are one place on a map. */
const SAME_PLACE_DEGREES = 0.0005;

/**
 * Where the branch map should look. Leaflet's `fitBounds` on a zero-size box
 * (every branch at one point, or a few metres apart) zooms to the tile
 * provider's maximum, so places that close get a normal street-level view
 * centred on them instead; real spreads are fitted, but never closer than
 * street level. `null` for no points.
 */
export function computeMapView(points: [number, number][]): MapView | null {
  if (points.length === 0) return null;
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);

  if (north - south < SAME_PLACE_DEGREES && east - west < SAME_PLACE_DEGREES) {
    return { kind: "point", center: [(south + north) / 2, (west + east) / 2], zoom: POINT_ZOOM };
  }
  return { kind: "bounds", bounds: [[south, west], [north, east]], maxZoom: POINT_ZOOM };
}

/**
 * react-leaflet reads `center`/`zoom`/`bounds` once, at mount. Keying the map
 * by its points remounts it when the business changes (the page component is
 * reused when a visitor follows a "similar business" link), so the view
 * follows the new branches instead of staying on the previous business.
 */
export function mapViewKey(points: [number, number][]): string {
  return points.map(([lat, lng]) => `${lat},${lng}`).join("|");
}
