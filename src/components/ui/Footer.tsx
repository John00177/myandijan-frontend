import { Send, Camera, Users, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import type { TranslationKey } from "../../i18n";

interface FooterLink {
  labelKey: TranslationKey;
  to: string | null;
}

function useColumns(): { titleKey: "footer.platform" | "footer.useful" | "footer.about"; items: FooterLink[] }[] {
  const { lang } = useLanguage();

  return [
    {
      titleKey: "footer.platform",
      items: [
        { labelKey: "nav.home", to: `/${lang}` },
        { labelKey: "nav.region", to: `/${lang}/search` },
        { labelKey: "nav.cities", to: `/${lang}/search` },
        { labelKey: "nav.services", to: `/${lang}/search?category=xizmatlar` },
      ],
    },
    {
      titleKey: "footer.useful",
      items: [
        { labelKey: "hero.chip.restaurants", to: `/${lang}/search?category=oziq-ovqat` },
        { labelKey: "hero.chip.hospitals", to: `/${lang}/search?category=sogliq` },
        { labelKey: "hero.chip.shops", to: `/${lang}/search?category=sotuv` },
        { labelKey: "hero.chip.banks", to: `/${lang}/search?category=xizmatlar` },
      ],
    },
    {
      titleKey: "footer.about",
      items: [
        { labelKey: "footer.aboutProject", to: null },
        { labelKey: "footer.contact", to: null },
        { labelKey: "footer.partnership", to: null },
      ],
    },
  ];
}

const SOCIALS = [
  { label: "Telegram", icon: Send },
  { label: "Instagram", icon: Camera },
  { label: "Facebook", icon: Users },
  { label: "YouTube", icon: Video },
];

export default function Footer() {
  const { t } = useLanguage();
  const columns = useColumns();

  return (
    <footer className="bg-[#080C14] border-t border-white/[0.06] mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {columns.map((col) => (
            <div key={col.titleKey}>
              <h4 className="text-sm font-semibold text-ink mb-4">{t(col.titleKey)}</h4>
              <ul className="flex flex-col gap-2.5">
                {col.items.map((item) =>
                  item.to ? (
                    <li key={item.labelKey}>
                      <Link
                        to={item.to}
                        className="text-sm text-ink-muted hover:text-primary transition-colors"
                      >
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  ) : (
                    <li key={item.labelKey} className="text-sm text-ink-muted cursor-default">
                      {t(item.labelKey)}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="text-sm font-semibold text-ink mb-4">{t("footer.support")}</h4>
            <ul className="flex flex-col gap-2.5">
              {SOCIALS.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink transition-colors cursor-pointer"
                >
                  <Icon size={16} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.06] mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-bold text-lg tracking-tight">
            <span className="text-ink">My</span> <span className="text-primary">Andijan</span>
          </span>
          <span className="text-xs text-ink-muted">© 2026 My Andijan</span>
        </div>
      </div>
    </footer>
  );
}
