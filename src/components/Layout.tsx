import { AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageTransition from "./PageTransition";
import ProfileCompletionBanner from "./profile/ProfileCompletionBanner";
import RouteFallback from "./RouteFallback";
import SafeScrollReveal from "./SafeScrollReveal";
import Footer from "./ui/Footer";
import Header, { MobileHeader } from "./ui/Header";
import MobileNav from "./ui/MobileNav";

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-base">
      <Header />
      <MobileHeader />

      {/*
        Header/MobileHeader are `fixed`, so anything that needs to sit below
        them in normal flow needs the same top clearance THEY were sized for
        — a bare <ProfileCompletionBanner /> here would render at y=0 and get
        hidden underneath the fixed header instead of appearing under it.
        Both the banner and <main> share one pt-14/md:pt-16 wrapper so there's
        exactly one gap to clear the header, not a doubled-up one when the
        banner happens to be visible.
      */}
      <div className="pt-14 md:pt-16">
        {/*
          AuthUser has no updatedAt to key on, so the key is the 4 fields the
          banner actually cares about plus id — forces a full remount (not
          just a re-render) whenever profile-completeness could have
          changed, which is a stronger guarantee than relying on the
          component noticing on its own.
        */}
        <ProfileCompletionBanner key={`${user?.id}-${user?.email}-${user?.age}-${user?.gender}-${user?.districtId}`} />

        <main className="pb-20 md:pb-0">
          {/*
            Keyed on pathname only: the search page rewrites its query string on
            every filter change, and keying on those would remount the page and
            refetch on each keystroke.

            Suspense sits inside the shell so a loading route chunk swaps only the
            content area, leaving the header and bottom nav in place.
          */}
          <Suspense fallback={<RouteFallback />}>
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>

      <div className="hidden md:block">
        <SafeScrollReveal label="footer">
          <Footer />
        </SafeScrollReveal>
      </div>
      <MobileNav />
    </div>
  );
}
