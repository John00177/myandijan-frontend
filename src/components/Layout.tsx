import { AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import PageTransition from "./PageTransition";
import RouteFallback from "./RouteFallback";
import SafeScrollReveal from "./SafeScrollReveal";
import Footer from "./ui/Footer";
import Header, { MobileHeader } from "./ui/Header";
import MobileNav from "./ui/MobileNav";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-base">
      <Header />
      <MobileHeader />

      <main className="pt-14 md:pt-16 pb-20 md:pb-0">
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

      <div className="hidden md:block">
        <SafeScrollReveal label="footer">
          <Footer />
        </SafeScrollReveal>
      </div>
      <MobileNav />
    </div>
  );
}
