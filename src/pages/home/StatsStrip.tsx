import { Building2, GraduationCap, HeartPulse, MapPin, MessageSquare, Users } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useRegions } from "../../hooks/useRegions";
import type { TranslationKey } from "../../i18n";

interface Stat {
  icon: typeof MapPin;
  value: string;
  labelKey: TranslationKey;
}

export default function StatsStrip() {
  const { lang, t } = useLanguage();
  const { regions, loading } = useRegions(lang);

  const districtCount = regions.reduce((sum, r) => sum + r.districts.length, 0);

  const stats: Stat[] = [
    { icon: MapPin, value: loading ? "…" : `${districtCount}+`, labelKey: "stats.districts" },
    { icon: Building2, value: "500+", labelKey: "stats.businesses" },
    { icon: MessageSquare, value: "2000+", labelKey: "stats.reviews" },
    { icon: Users, value: "10000+", labelKey: "stats.users" },
    { icon: HeartPulse, value: "650+", labelKey: "stats.health" },
    { icon: GraduationCap, value: "120+", labelKey: "stats.gov" },
  ];

  return (
    <section className="w-full bg-surface/50 border-y border-white/[0.06] py-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ icon: Icon, value, labelKey }) => (
          <div key={labelKey}>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon size={20} />
            </div>
            <div className="text-3xl font-bold text-ink mt-3">{value}</div>
            <div className="text-xs text-ink-muted uppercase tracking-wider mt-1">{t(labelKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
