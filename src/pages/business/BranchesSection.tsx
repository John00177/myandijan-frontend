import { MapPin, Navigation, Phone } from "lucide-react";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import { useLanguage } from "../../contexts/LanguageContext";
import { localizedName } from "../../lib/localize";
import { branchDirectionsUrl } from "../../lib/maps";
import type { Branch } from "../../types";

/** One link per branch — ActionButtons only ever covers the primary branch. */
function DirectionsLink({ branch }: { branch: Branch }) {
  const { t } = useLanguage();
  const url = branchDirectionsUrl(branch);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-blue-300 mt-2"
    >
      <Navigation size={14} />
      {t("directions")}
    </a>
  );
}

interface BranchesSectionProps {
  branches: Branch[] | undefined;
}

export default function BranchesSection({ branches }: BranchesSectionProps) {
  const { lang, t } = useLanguage();

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-ink mb-4">{t("branches")}</h2>

      {!branches || branches.length === 0 ? (
        <EmptyState icon={MapPin} title={t("noBranches")} body={t("noBranchesBody")} />
      ) : (
        <div className="flex flex-col gap-3">
          {branches.map((branch) => (
            <Card key={branch.id} className="p-4">
              <div className="font-semibold text-ink">{localizedName(branch, lang)}</div>
              {branch.address && (
                <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-1">
                  <MapPin size={14} />
                  {branch.address}
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-1">
                  <Phone size={14} />
                  {branch.phone}
                </div>
              )}
              <DirectionsLink branch={branch} />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
