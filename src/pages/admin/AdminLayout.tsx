import { useState, type ReactNode } from "react";
import AdminMobileDrawer from "./AdminMobileDrawer";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import type { AdminView } from "./types";

const VIEW_TITLES: Record<AdminView, string> = {
  home: "Boshqaruv paneli",
  analytics: "Analitika",
  businesses: "Bizneslar",
  categories: "Turkumlar",
  users: "Foydalanuvchilar",
  reviews: "Sharhlar",
  events: "Tadbirlar",
  regions: "Viloyatlar",
  audit: "Audit jurnali",
  settings: "Sozlamalar",
};

interface AdminLayoutProps {
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
  children: ReactNode;
}

export default function AdminLayout({ activeView, onSelectView, children }: AdminLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base flex">
      <aside className="hidden md:block w-64 h-screen sticky top-0 border-r border-white/[0.06]">
        <AdminSidebar activeView={activeView} onSelectView={onSelectView} />
      </aside>

      <AdminMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeView={activeView}
        onSelectView={onSelectView}
      />

      <div className="flex-1 min-w-0">
        <AdminTopBar title={VIEW_TITLES[activeView]} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
