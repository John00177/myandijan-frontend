import { lazy, Suspense } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { hasCoordinates } from "../../lib/maps";
import type { Branch } from "../../types";

// Leaflet is the heaviest thing a business page could pull in and it touches
// `window` at import time (docs/SSG.md), so it loads only for a business that
// actually has a located branch — and never blocks the rest of the page.
const BranchMap = lazy(() => import("./BranchMap"));

interface LocationSectionProps {
  branches: Branch[] | undefined;
}

export default function LocationSection({ branches }: LocationSectionProps) {
  const { t } = useLanguage();
  const located = (branches ?? []).filter(hasCoordinates);

  // No coordinates: no map, no empty frame. The branch list below still shows
  // the address and a directions link.
  if (located.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-ink mb-4">{t("location")}</h2>
      <div
        role="region"
        aria-label={t("locationMapLabel")}
        className="h-72 rounded-2xl overflow-hidden border border-white/[0.06] relative z-0"
      >
        <Suspense fallback={<div className="h-full w-full bg-elevated animate-pulse" aria-hidden="true" />}>
          <BranchMap branches={located} />
        </Suspense>
      </div>
    </section>
  );
}
