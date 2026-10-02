import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  Flag,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { initials } from "../../lib/initials";
import { canOpenView, type AdminView } from "./types";

const MENU_ITEMS: { view: AdminView; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Boshqaruv paneli", icon: LayoutDashboard },
  { view: "analytics", label: "Analitika", icon: BarChart3 },
  { view: "businesses", label: "Bizneslar", icon: Building2 },
  { view: "categories", label: "Turkumlar", icon: Tags },
  { view: "users", label: "Foydalanuvchilar", icon: Users },
  { view: "reviews", label: "Sharhlar", icon: MessageSquare },
  { view: "reports", label: "Shikoyatlar", icon: Flag },
  { view: "claims", label: "Da'volar", icon: ClipboardCheck },
  { view: "events", label: "Tadbirlar", icon: Calendar },
  { view: "regions", label: "Viloyatlar", icon: MapPin },
  { view: "audit", label: "Audit jurnali", icon: FileText },
  { view: "settings", label: "Sozlamalar", icon: Settings },
];

const ROLE_BADGE: Partial<Record<string, string>> = {
  MODERATOR: "Moderator",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

interface AdminSidebarProps {
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
  /** Called after a menu item is picked — lets the mobile drawer close itself. */
  onNavigate?: () => void;
}

export default function AdminSidebar({ activeView, onSelectView, onNavigate }: AdminSidebarProps) {
  const { lang } = useLanguage();
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  // Only views whose capability the user holds (D-75).
  const items = MENU_ITEMS.filter((item) => canOpenView(item.view, can));

  function handleSelect(view: AdminView) {
    onSelectView(view);
    onNavigate?.();
  }

  function handleLogout() {
    logout();
    navigate(`/${lang}`);
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 flex items-center gap-2">
        <span className="font-bold text-lg tracking-tight">
          <span className="text-ink">My</span> <span className="text-primary">Andijan</span>
        </span>
        {/* Display label only — nothing is decided by it. */}
        <Badge tone="danger">{user ? (ROLE_BADGE[user.role] ?? "Admin") : "Admin"}</Badge>
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {items.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => handleSelect(item.view)}
              className={`w-full flex items-center gap-3 py-2 pl-3 pr-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-danger/10 text-danger border-l-2 border-danger"
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
          <div className="size-9 rounded-full bg-danger/20 text-danger flex items-center justify-center text-sm font-bold shrink-0">
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
