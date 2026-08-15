import { MotionConfig } from "framer-motion";
import { lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import LangShell from "./components/LangShell";
import Toaster from "./components/ui/Toaster";
import { AuthProvider } from "./contexts/AuthContext";

/*
 * Routes are code-split so the initial bundle carries only the shell plus the
 * homepage's dependencies. The search page in particular pulls in Leaflet, which
 * no other route needs.
 */
const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const BusinessDetailPage = lazy(() => import("./pages/BusinessDetailPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AddBusinessPage = lazy(() => import("./pages/dashboard/AddBusinessPage"));
const DashboardBusinessEditPage = lazy(() => import("./pages/DashboardBusinessEditPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

export default function App() {
  return (
    <HelmetProvider>
      {/* reducedMotion="user" makes every motion component below respect
          prefers-reduced-motion without each one opting in individually. */}
      <MotionConfig reducedMotion="user">
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/uz" replace />} />

              {/*
                LangShell provides LanguageProvider + the single AuthModal instance
                for everything under /:lang. The marketing site nests under Layout
                (header/footer/bottom nav); the dashboard is a sibling with its own
                shell, so it never inherits that chrome.
              */}
              <Route path="/:lang" element={<LangShell />}>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="business/:slug" element={<BusinessDetailPage />} />
                  <Route path="events" element={<EventsPage />} />
                  <Route path="favorites" element={<FavoritesPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="dashboard/business/new" element={<AddBusinessPage />} />
                <Route path="dashboard/business/:id/edit" element={<DashboardBusinessEditPage />} />
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </HelmetProvider>
  );
}
