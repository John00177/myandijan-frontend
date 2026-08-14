import { useState, type ReactNode } from "react";
import MobileDrawer from "./MobileDrawer";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import type { DashboardView } from "./types";

const VIEW_TITLES: Record<DashboardView, string> = {
  home: "Umumiy ko'rsatkichlar",
  businesses: "Mening bizneslarim",
  inventory: "Omborxona",
  reviews: "Sharhlar",
  events: "Tadbirlar",
  ads: "Reklamalar",
  settings: "Sozlamalar",
};

interface DashboardLayoutProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  children: ReactNode;
}

export default function DashboardLayout({ activeView, onSelectView, children }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base flex">
      <aside className="hidden md:block w-64 h-screen sticky top-0 border-r border-white/[0.06]">
        <Sidebar activeView={activeView} onSelectView={onSelectView} />
      </aside>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeView={activeView}
        onSelectView={onSelectView}
      />

      <div className="flex-1 min-w-0">
        <TopBar title={VIEW_TITLES[activeView]} onOpenMenu={() => setDrawerOpen(true)} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
