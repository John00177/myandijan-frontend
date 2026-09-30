import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Navigate, Outlet, Route, BrowserRouter, Routes, useParams } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import LangShell from "./components/LangShell";
import RouteFallback from "./components/RouteFallback";
import { AuthProvider } from "./contexts/AuthContext";

// Business editing now happens in-place via EditBusinessModal from
// MyBusinessesView — nothing in the app links to this route anymore, but it
// stays mapped (rather than 404ing) in case of old bookmarks/links.
function RedirectToDashboardBusinesses() {
  const { lang } = useParams();
  return <Navigate to={`/${lang}/dashboard`} state={{ view: "businesses" }} replace />;
}

function RedirectToSignup() {
  const { lang } = useParams();
  return <Navigate to={`/${lang}/signup`} replace />;
}

/** The claim flow lives at /claim; /business/claim is the path people reach for. */
function RedirectToClaim() {
  const { lang } = useParams();
  return <Navigate to={`/${lang}/claim`} replace />;
}

/** Suspense boundary for the lazy routes that render outside Layout. */
function LazyRouteShell() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
  );
}

/*
 * Routes are code-split so the initial bundle carries only the shell plus the
 * homepage's dependencies. The search page in particular pulls in Leaflet, which
 * no other route needs.
 */
const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const BusinessDetailPage = lazy(() => import("./pages/BusinessDetailPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const CategoryLandingPage = lazy(() => import("./pages/CategoryLandingPage"));
const DistrictLandingPage = lazy(() => import("./pages/DistrictLandingPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ClaimPage = lazy(() => import("./pages/ClaimPage"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const AddBusinessPage = lazy(() => import("./pages/dashboard/AddBusinessPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

export default function App() {
  return (
    <HelmetProvider>
      {/* reducedMotion="user" makes every motion component below respect
          prefers-reduced-motion without each one opting in individually. */}
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
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
                    <Route path="category/:slug" element={<CategoryLandingPage />} />
                    <Route path="district/:slug" element={<DistrictLandingPage />} />
                    <Route path="business/:slug" element={<BusinessDetailPage />} />
                    <Route path="events" element={<EventsPage />} />
                    <Route path="events/:slug" element={<EventDetailPage />} />
                    <Route path="favorites" element={<FavoritesPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="signup" element={<SignupPage />} />
                    <Route path="claim" element={<ClaimPage />} />
                    <Route path="business/claim" element={<RedirectToClaim />} />
                    {/* /register never shipped as a route, but the old auth
                        modal's register tab and any external links point at it,
                        so it resolves here rather than 404ing. */}
                    <Route path="register" element={<RedirectToSignup />} />
                  </Route>

                  {/*
                    The dashboard/admin routes are lazy too but sit outside Layout,
                    which is where the site's only Suspense boundary lives — without
                    this one, their chunk load has no fallback to show.
                  */}
                  <Route element={<LazyRouteShell />}>
                    <Route path="dashboard" element={<OwnerDashboard />} />
                    <Route path="dashboard/business/new" element={<AddBusinessPage />} />
                    <Route path="dashboard/business/:id/edit" element={<RedirectToDashboardBusinesses />} />
                    <Route path="admin" element={<AdminDashboard />} />
                  </Route>
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </MotionConfig>
    </HelmetProvider>
  );
}
