import { Building2 } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MetaTags from "../components/seo/MetaTags";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useRequireAuth } from "../hooks/useRequireAuth";
import DashboardLayout from "./dashboard/DashboardLayout";
import type { DashboardView } from "./dashboard/types";
import AdsView from "./dashboard/views/AdsView";
import DashboardHomeView from "./dashboard/views/DashboardHomeView";
import EventsView from "./dashboard/views/EventsView";
import InventoryView from "./dashboard/views/InventoryView";
import MyBusinessesView from "./dashboard/views/MyBusinessesView";
import PremiumView from "./dashboard/views/PremiumView";
import ReviewsView from "./dashboard/views/ReviewsView";
import SettingsView from "./dashboard/views/SettingsView";

export default function OwnerDashboard() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuth();
  const isOwner = can("business.manage_own");
  const { user, token } = useRequireAuth();
  // AddBusinessPage navigates back here with { state: { view } } so a sidebar
  // click from that page lands on the right tab instead of always "home".
  // DashboardHomeView's per-business "Tahrirlash" button adds editBusinessId
  // so that tab opens straight into EditBusinessModal instead of just
  // landing on the list.
  const navState = location.state as { view?: DashboardView; editBusinessId?: number } | null;
  const requestedView = navState?.view;
  const [activeView, setActiveView] = useState<DashboardView>(requestedView ?? "home");
  const [editBusinessId, setEditBusinessId] = useState<number | undefined>(navState?.editBusinessId);

  function goEditBusiness(id: number) {
    setEditBusinessId(id);
    setActiveView("businesses");
  }

  // No token: useRequireAuth already opened the AuthModal. Render nothing
  // rather than the "not an owner" message, which would flash under it.
  if (!token || !user) return null;

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-6">
        <EmptyState
          icon={Building2}
          title="Siz biznes egasi emassiz"
          body="Bu bo'lim faqat biznes egalari uchun mavjud."
          // Goes to search, where a listing can be claimed — "add" was
          // misleading: creating stays owner-only (D-75, Phase 16D).
          actionLabel="Biznesingizni toping"
          onAction={() => navigate(`/${lang}/search`)}
        />
      </div>
    );
  }

  return (
    <>
      <MetaTags title="Boshqaruv paneli — My Andijan" description="Biznes egalari uchun boshqaruv paneli." noIndex />
      <DashboardLayout activeView={activeView} onSelectView={setActiveView}>
        {activeView === "home" && <DashboardHomeView onSelectView={setActiveView} onEditBusiness={goEditBusiness} />}
        {activeView === "businesses" && <MyBusinessesView autoOpenBusinessId={editBusinessId} />}
        {activeView === "premium" && <PremiumView />}
        {activeView === "inventory" && <InventoryView />}
        {activeView === "reviews" && <ReviewsView />}
        {activeView === "events" && <EventsView />}
        {activeView === "ads" && <AdsView />}
        {activeView === "settings" && <SettingsView />}
      </DashboardLayout>
    </>
  );
}
