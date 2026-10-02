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
import { canOpenView, firstOpenView, type AdminView } from "./types";
import AdminAuditLogsView from "./views/AdminAuditLogsView";
import AdminBusinessesView from "./views/AdminBusinessesView";
import AdminCategoriesView from "./views/AdminCategoriesView";
import AdminClaimsView from "./views/AdminClaimsView";
import AdminEventsView from "./views/AdminEventsView";
import AdminHomeView from "./views/AdminHomeView";
import AdminRegionsView from "./views/AdminRegionsView";
import AdminReportsView from "./views/AdminReportsView";
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
  const { can } = useAuth();
  const { user, token } = useRequireAuth();
  // What the user picked; the view actually shown is re-derived from their
  // capabilities on every render (D-75), so it is always one they may open —
  // e.g. a moderator, who lacks analytics.platform, lands on the queue.
  const [selectedView, setActiveView] = useState<AdminView | null>(null);
  const landing = firstOpenView(can);
  const activeView = selectedView && canOpenView(selectedView, can) ? selectedView : landing;

  // No token: useRequireAuth already opened the AuthModal. Render nothing rather
  // than the "no admin rights" message, which would flash underneath it.
  if (!token || !user) return null;

  // No admin view is open to this user (CUSTOMER, BUSINESS_OWNER, SUPPORT —
  // or anyone whose capability list has not arrived yet). The server would
  // refuse every admin request anyway.
  if (!activeView) {
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
        {activeView === "reports" && <AdminReportsView />}
        {activeView === "claims" && <AdminClaimsView />}
        {activeView === "events" && <AdminEventsView />}
        {activeView === "regions" && <AdminRegionsView />}
        {activeView === "audit" && <AdminAuditLogsView />}
        {activeView === "settings" && <AdminSettingsView />}
      </AdminLayout>
    </>
  );
}
