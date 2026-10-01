import { ShieldAlert } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import MetaTags from "../../components/seo/MetaTags";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import AdminLayout from "./AdminLayout";
import type { AdminView } from "./types";
import AdminAuditLogsView from "./views/AdminAuditLogsView";
import AdminBusinessesView from "./views/AdminBusinessesView";
import AdminCategoriesView from "./views/AdminCategoriesView";
import AdminClaimsView from "./views/AdminClaimsView";
import AdminEventsView from "./views/AdminEventsView";
import AdminHomeView from "./views/AdminHomeView";
import AdminRegionsView from "./views/AdminRegionsView";
import AdminReviewsView from "./views/AdminReviewsView";
import AdminSettingsView from "./views/AdminSettingsView";
import AdminUsersView from "./views/AdminUsersView";

/*
 * Analytics is split out from the rest of the admin bundle: it is the only view
 * that pulls in Recharts (~415 kB raw), and bundling that into the shared admin
 * chunk would make every other admin view pay for charts it never renders.
 */
const AnalyticsView = lazy(() => import("./views/AnalyticsView"));

function AnalyticsFallback() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[164px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[376px]" />
        ))}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { user, token } = useRequireAuth();
  const [activeView, setActiveView] = useState<AdminView>("home");

  // No token: useRequireAuth already opened the AuthModal. Render nothing rather
  // than the "no admin rights" message, which would flash underneath it.
  if (!token || !user) return null;

  // Both CUSTOMER and BUSINESS_OWNER land here — neither has admin rights, and
  // the message is the same for both.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-6">
        <EmptyState
          icon={ShieldAlert}
          title="Sizda admin huquqlari yo'q"
          body="Bu bo'lim faqat administratorlar uchun mavjud."
          actionLabel="Bosh sahifaga qaytish"
          onAction={() => navigate(`/${lang}`)}
        />
      </div>
    );
  }

  return (
    <>
      <MetaTags title="Admin — My Andijan" description="Administrator boshqaruv paneli." noIndex />
      <AdminLayout activeView={activeView} onSelectView={setActiveView}>
        {activeView === "home" && <AdminHomeView onSelectView={setActiveView} />}
        {activeView === "analytics" && (
          <Suspense fallback={<AnalyticsFallback />}>
            <AnalyticsView />
          </Suspense>
        )}
        {activeView === "businesses" && <AdminBusinessesView />}
        {activeView === "categories" && <AdminCategoriesView />}
        {activeView === "users" && <AdminUsersView />}
        {activeView === "reviews" && <AdminReviewsView />}
        {activeView === "claims" && <AdminClaimsView />}
        {activeView === "events" && <AdminEventsView />}
        {activeView === "regions" && <AdminRegionsView />}
        {activeView === "audit" && <AdminAuditLogsView />}
        {activeView === "settings" && <AdminSettingsView />}
      </AdminLayout>
    </>
  );
}
