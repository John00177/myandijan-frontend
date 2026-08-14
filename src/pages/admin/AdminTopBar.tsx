import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { initials } from "../../lib/initials";

interface AdminTopBarProps {
  title: string;
  onOpenMenu: () => void;
}

export default function AdminTopBar({ title, onOpenMenu }: AdminTopBarProps) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-16 bg-card/80 backdrop-blur border-b border-white/[0.06] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Menyu"
          className="md:hidden size-10 rounded-lg flex items-center justify-center text-ink-muted hover:bg-white/[0.05]"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          aria-label="Bildirishnomalar"
          className="size-10 rounded-lg flex items-center justify-center text-ink-muted hover:bg-white/[0.05] transition-colors"
        >
          <Bell size={18} />
        </button>
        <Badge tone="danger">Admin</Badge>
        {user && (
          <button
            onClick={() => navigate(`/${lang}/profile`)}
            aria-label="Profil"
            className="size-9 rounded-full bg-danger/20 text-danger flex items-center justify-center text-sm font-bold hover:bg-danger/30 transition-colors"
          >
            {initials(user.fullName)}
          </button>
        )}
      </div>
    </div>
  );
}
