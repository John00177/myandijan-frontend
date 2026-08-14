import { LayoutDashboard, LogOut, Menu, Search, ShieldAlert, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { initials } from "../../lib/initials";
import type { Lang } from "../../types";
import type { TranslationKey } from "../../i18n";
import Badge from "./Badge";
import Button from "./Button";

const LANGS: Lang[] = ["uz", "ru", "en"];

interface NavItem {
  key: TranslationKey;
  to: string | null;
}

function useNavItems(): NavItem[] {
  const { lang } = useLanguage();

  return [
    { key: "nav.home", to: `/${lang}` },
    { key: "nav.region", to: `/${lang}/search` },
    { key: "nav.cities", to: `/${lang}/search` },
    { key: "nav.services", to: `/${lang}/search?category=xizmatlar` },
    { key: "nav.events", to: `/${lang}/events` },
    { key: "nav.news", to: null },
    { key: "nav.about", to: null },
  ];
}

function AvatarMenu() {
  const { lang, t } = useLanguage();
  const { user, isOwner, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!user) return null;

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  function handleLogout() {
    setOpen(false);
    logout();
    navigate(`/${lang}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav.profileMenu")}
        className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold hover:bg-primary/30 transition-colors active:scale-[0.95]"
      >
        {initials(user.fullName)}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-white/[0.08] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)] p-1.5 z-50">
          <button
            onClick={() => go(`/${lang}/profile`)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-body hover:bg-white/[0.05] hover:text-ink transition-colors"
          >
            <UserIcon size={16} />
            {t("nav.profile")}
          </button>
          {isOwner && (
            <button
              onClick={() => go(`/${lang}/dashboard`)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-body hover:bg-white/[0.05] hover:text-ink transition-colors"
            >
              <LayoutDashboard size={16} />
              {t("nav.dashboard")}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => go(`/${lang}/admin`)}
              className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-body hover:bg-white/[0.05] hover:text-ink transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert size={16} />
                {t("nav.adminPanel")}
              </span>
              <Badge tone="danger">ADMIN</Badge>
            </button>
          )}
          <div className="h-px bg-white/[0.06] my-1" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={16} />
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { lang, setLang, t } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const location = useLocation();
  const navItems = useNavItems();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentPath = `${location.pathname}${location.search}`;

  return (
    <header
      className={`fixed top-0 z-50 w-full h-16 transition-all duration-300 hidden md:block ${
        scrolled ? "bg-surface/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <Link to={`/${lang}`} className="font-bold text-xl tracking-tight">
          <span className="text-ink">My</span> <span className="text-primary">Andijan</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
          {navItems.map((item) => {
            const isActive = item.to === currentPath || (item.to === `/${lang}` && location.pathname === `/${lang}`);
            const className = isActive ? "text-ink" : "hover:text-primary transition-colors";

            if (!item.to) {
              return (
                <span key={item.key} className="cursor-default text-ink-muted/60">
                  {t(item.key)}
                </span>
              );
            }

            return (
              <Link key={item.key} to={item.to} className={className}>
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs font-semibold text-ink-muted">
            {LANGS.map((code, i) => (
              <span key={code} className="flex items-center gap-1">
                <button
                  onClick={() => setLang(code)}
                  className={`hover:text-ink transition-colors ${code === lang ? "text-ink" : ""}`}
                >
                  {code.toUpperCase()}
                </button>
                {i < LANGS.length - 1 && <span className="text-ink-muted/40">|</span>}
              </span>
            ))}
          </div>
          {user ? (
            <AvatarMenu />
          ) : (
            <Button variant="secondary" size="sm" onClick={openAuthModal}>
              {t("auth.login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileHeader() {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="md:hidden fixed top-0 z-50 w-full h-14 bg-surface border-b border-white/[0.06]">
      <div className="h-full flex items-center justify-between px-4">
        <button aria-label="Menu" className="text-ink-muted hover:text-ink">
          <Menu size={22} />
        </button>
        <Link to={`/${lang}`} className="font-bold text-lg tracking-tight">
          <span className="text-ink">My</span> <span className="text-primary">Andijan</span>
        </Link>
        <button
          aria-label="Search"
          onClick={() => navigate(`/${lang}/search`)}
          className="text-ink-muted hover:text-ink"
        >
          <Search size={20} />
        </button>
      </div>
    </header>
  );
}
