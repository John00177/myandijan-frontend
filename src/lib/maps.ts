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
