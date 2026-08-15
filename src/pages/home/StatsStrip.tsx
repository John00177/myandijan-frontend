import { Building2, GraduationCap, HeartPulse, MapPin, MessageSquare, Users } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useRegions } from "../../hooks/useRegions";
import { useCountUp } from "../../hooks/useCountUp";
import type { TranslationKey } from "../../i18n";

interface Stat {
  icon: typeof MapPin;
  target: number;
  labelKey: TranslationKey;
}

function StatTile({ icon: Icon, target, labelKey }: Stat) {
  const { t } = useLanguage();
  const { ref, value } = useCountUp(target);

  return (
    <div ref={ref}>
      <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div className="text-3xl font-bold text-ink mt-3">{value}+</div>
      <div className="text-xs text-ink-muted uppercase tracking-wider mt-1">{t(labelKey)}</div>
    </div>
  );
}

export default function StatsStrip() {
  const { lang } = useLanguage();
  const { regions } = useRegions(lang);

  // Target updates from 0 once regions load; useCountUp re-runs its
  // animation when target changes while already in view, so this never
  // needs a separate loading state — it just counts up again to the real
  // number the moment it arrives.
  const districtCount = regions.reduce((sum, r) => sum + r.districts.length, 0);

  const stats: Stat[] = [
    { icon: MapPin, target: districtCount, labelKey: "stats.districts" },
    { icon: Building2, target: 500, labelKey: "stats.businesses" },
    { icon: MessageSquare, target: 2000, labelKey: "stats.reviews" },
    { icon: Users, target: 10000, labelKey: "stats.users" },
    { icon: HeartPulse, target: 650, labelKey: "stats.health" },
    { icon: GraduationCap, target: 120, labelKey: "stats.gov" },
  ];

  return (
    <section className="w-full bg-surface/50 border-y border-white/[0.06] py-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <StatTile key={stat.labelKey} {...stat} />
        ))}
      </div>
    </section>
  );
}
