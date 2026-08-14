import {
  Briefcase,
  Building2,
  Bus,
  Clock,
  CloudSun,
  Landmark,
  Megaphone,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedCard from "../../components/AnimatedCard";
import StaggerContainer, { StaggerItem } from "../../components/StaggerContainer";
import { useLanguage } from "../../contexts/LanguageContext";
import type { TranslationKey } from "../../i18n";

interface Service {
  icon: LucideIcon;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}

const SERVICES: Service[] = [
  { icon: Briefcase, titleKey: "services.jobs.title", descriptionKey: "services.jobs.desc" },
  { icon: Megaphone, titleKey: "services.classifieds.title", descriptionKey: "services.classifieds.desc" },
  { icon: Bus, titleKey: "services.transport.title", descriptionKey: "services.transport.desc" },
  { icon: CloudSun, titleKey: "services.weather.title", descriptionKey: "services.weather.desc" },
  { icon: Clock, titleKey: "services.queue.title", descriptionKey: "services.queue.desc" },
  { icon: MessageSquareWarning, titleKey: "services.complaint.title", descriptionKey: "services.complaint.desc" },
  { icon: Building2, titleKey: "services.gov.title", descriptionKey: "services.gov.desc" },
  { icon: Landmark, titleKey: "services.banks.title", descriptionKey: "services.banks.desc" },
];

export default function UsefulServices() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <h2 className="text-2xl font-bold text-ink mb-6">{t("services.title")}</h2>

      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {SERVICES.map(({ icon: Icon, titleKey, descriptionKey }) => (
          <StaggerItem key={titleKey}>
            <AnimatedCard
              onClick={() => navigate(`/${lang}/search`)}
              className="p-4 flex flex-col items-center text-center gap-3"
            >
              <div className="size-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
                <Icon size={22} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-ink">{t(titleKey)}</div>
                <div className="text-xs text-ink-muted mt-1">{t(descriptionKey)}</div>
              </div>
            </AnimatedCard>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
