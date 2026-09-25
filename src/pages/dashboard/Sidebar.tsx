import { Building2, Calendar, Crown, LayoutDashboard, Megaphone, MessageSquare, Package, Settings, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { initials } from "../../lib/initials";
import type { DashboardView } from "./types";

const MENU_ITEMS: { view: DashboardView; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Umumiy ko'rsatkichlar", icon: LayoutDashboard },
  { view: "businesses", label: "Mening bizneslarim", icon: Building2 },
  { view: "premium", label: "Premium", icon: Crown },
  { view: "inventory", label: "Omborxona", icon: Package },
  { view: "reviews", label: "Sharhlar", icon: MessageSquare },
  { view: "events", label: "Tadbirlar", icon: Calendar },
  { view: "ads", label: "Reklamalar", icon: Megaphone },
  { view: "settings", label: "Sozlamalar", icon: Settings },
];

interface SidebarProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  /** Called after a menu item is picked — lets the mobile drawer close itself. */
  onNavigate?: () => void;
}

export default function Sidebar({ activeView, onSelectView, onNavigate }: SidebarProps) {
  const { lang } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleSelect(view: DashboardView) {
    onSelectView(view);
    onNavigate?.();
  }

  function handleLogout() {
    logout();
    navigate(`/${lang}`);
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4">
        <span className="font-bold text-lg tracking-tight">
          <span className="text-ink">My</span> <span className="text-primary">Andijan</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {MENU_ITEMS.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => handleSelect(item.view)}
              className={`w-full flex items-center gap-3 py-2 pl-3 pr-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-ink-muted hover:text-ink hover:bg-white/[0.05] border-l-2 border-transparent"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="p-3 border-t border-white/[0.06] flex items-center gap-3">
          <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
            {initials(user.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink truncate">{user.fullName}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-ink-muted hover:text-danger transition-colors shrink-0"
          >
            Chiqish
          </button>
        </div>
      )}
    </div>
  );
}
