import { AnimatePresence, motion } from "framer-motion";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import Sidebar from "./Sidebar";
import type { DashboardView } from "./types";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
}

export default function MobileDrawer({ open, onClose, activeView, onSelectView }: MobileDrawerProps) {
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const panelTransition = useMotionTransition(TRANSITIONS.smooth);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/*
            pointerEvents is part of both exit targets, not just opacity/x. It is
            not interpolatable, so Framer applies it the instant exit begins. If
            the exit animation ever stalls before unmount (frozen rAF, backgrounded
            tab), the scrim and panel are already click-through rather than an
            invisible layer sitting on top of the page eating every tap. Same
            fix as AuthModal, applied here after finding the drawer lacked it.
          */}
          <motion.div
            className="fixed inset-0 z-50 bg-black md:hidden"
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.6, pointerEvents: "auto" }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={backdropTransition}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
            initial={shouldAnimate ? { x: "-100%" } : false}
            animate={{ x: 0, pointerEvents: "auto" }}
            exit={{ x: "-100%", pointerEvents: "none" }}
            transition={panelTransition}
          >
            <Sidebar activeView={activeView} onSelectView={onSelectView} onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
