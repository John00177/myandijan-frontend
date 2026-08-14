import { Briefcase, ChevronRight, Heart, LogOut, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MetaTags from "../components/seo/MetaTags";
import Badge from "../components/ui/Badge";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useFavorites } from "../hooks/useFavorites";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { initials } from "../lib/initials";
import type { UserRole } from "../types";

const ROLE_BADGE: Record<UserRole, { label: string; tone: "blue" | "amber" | "purple" }> = {
  CUSTOMER: { label: "Mijoz", tone: "blue" },
  BUSINESS_OWNER: { label: "Biznes egasi", tone: "amber" },
  ADMIN: { label: "Admin", tone: "purple" },
};

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

export default function ProfilePage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { user, isOwner, logout } = useAuth();
  const { token } = useRequireAuth();
  const { favorites, loading: favoritesLoading } = useFavorites(lang, token);

  if (!token || !user) return null;

  const roleBadge = ROLE_BADGE[user.role];

  const menuItems: MenuItem[] = [
    ...(isOwner
      ? [{ label: "Mening bizneslarim", icon: Briefcase, onClick: () => navigate(`/${lang}/dashboard`) }]
      : []),
    { label: "Saqlanganlar", icon: Heart, onClick: () => navigate(`/${lang}/favorites`) },
    { label: "Sozlamalar", icon: Settings, onClick: () => {} },
    {
      label: "Chiqish",
      icon: LogOut,
      onClick: () => {
        logout();
        navigate(`/${lang}`);
      },
    },
  ];

  return (
    <>
      <MetaTags title="Profil — My Andijan" description="Foydalanuvchi profili." noIndex />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-card border border-white/[0.08] rounded-2xl p-6 flex items-center gap-4">
          <div className="size-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
            {initials(user.fullName)}
          </div>
          <div>
            <div className="text-xl font-bold text-ink">{user.fullName}</div>
            <div className="text-sm text-ink-muted mt-1">{user.phone}</div>
            <Badge tone={roleBadge.tone} className="mt-2">
              {roleBadge.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-ink">{favoritesLoading ? "—" : favorites.length}</div>
            <div className="text-xs text-ink-muted mt-1">Saqlanganlar</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-ink">—</div>
            <div className="text-xs text-ink-muted mt-1">Sharhlar</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-ink">—</div>
            <div className="text-xs text-ink-muted mt-1">Bizneslar</div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {menuItems.map((item, i) => (
            <div key={item.label}>
              <button
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-3 text-ink font-medium">
                  <item.icon size={20} />
                  {item.label}
                </span>
                <ChevronRight size={16} className="text-ink-muted" />
              </button>
              {i < menuItems.length - 1 && <div className="h-px bg-white/[0.06] my-2" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
