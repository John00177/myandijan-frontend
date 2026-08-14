import { motion } from "framer-motion";
import { Bookmark, Calendar, Home, Search, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import type { TranslationKey } from "../../i18n";
import { TRANSITIONS, useMotionTransition } from "../../lib/motion-config";

export default function MobileNav() {
  const { lang, t } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const indicatorTransition = useMotionTransition(TRANSITIONS.indicatorSpring);

  const items: { labelKey: TranslationKey; icon: typeof Home; path: string; onClick: () => void }[] = [
    { labelKey: "nav.home", icon: Home, path: `/${lang}`, onClick: () => navigate(`/${lang}`) },
    { labelKey: "nav.search", icon: Search, path: `/${lang}/search`, onClick: () => navigate(`/${lang}/search`) },
    { labelKey: "nav.events", icon: Calendar, path: `/${lang}/events`, onClick: () => navigate(`/${lang}/events`) },
    {
      labelKey: "nav.saved",
      icon: Bookmark,
      path: `/${lang}/favorites`,
      onClick: () => (user ? navigate(`/${lang}/favorites`) : openAuthModal()),
    },
    {
      labelKey: "nav.profile",
      icon: User,
      path: `/${lang}/profile`,
      onClick: () => (user ? navigate(`/${lang}/profile`) : openAuthModal()),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 z-50 w-full h-16 bg-surface/95 backdrop-blur-lg border-t border-white/[0.10]">
      <div className="grid grid-cols-5 h-full">
        {items.map(({ labelKey, icon: Icon, path, onClick }) => {
          const isActive = location.pathname === path;

          return (
            <motion.button
              key={labelKey}
              onClick={onClick}
              whileTap={{ scale: 0.92 }}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? "text-primary" : "text-ink-muted"
              }`}
            >
              {isActive && (
                /*
                  Centred with mx-auto rather than -translate-x-1/2: layoutId
                  animates position through inline transforms, which would
                  override a translate utility mid-flight.
                */
                <motion.div
                  layoutId="activeTab"
                  transition={indicatorTransition}
                  className="absolute top-0 left-0 right-0 mx-auto h-0.5 w-8 rounded-full bg-primary"
                />
              )}
              <Icon size={20} fill={isActive ? "currentColor" : "none"} />
              {t(labelKey)}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
