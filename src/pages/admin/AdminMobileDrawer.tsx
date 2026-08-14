import { AnimatePresence, motion } from "framer-motion";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import AdminSidebar from "./AdminSidebar";
import type { AdminView } from "./types";

interface AdminMobileDrawerProps {
  open: boolean;
  onClose: () => void;
  activeView: AdminView;
  onSelectView: (view: AdminView) => void;
}

export default function AdminMobileDrawer({ open, onClose, activeView, onSelectView }: AdminMobileDrawerProps) {
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const panelTransition = useMotionTransition(TRANSITIONS.smooth);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/*
            pointerEvents is part of both exit targets. It is not interpolatable,
            so Framer applies it the instant exit begins — if the exit ever stalls
            before unmount, the scrim is already click-through instead of an
            invisible full-screen layer eating every tap. Same fix as AuthModal
            and the owner dashboard drawer.
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
            <AdminSidebar activeView={activeView} onSelectView={onSelectView} onNavigate={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
