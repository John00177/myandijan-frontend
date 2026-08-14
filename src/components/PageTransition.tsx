import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { TRANSITIONS, useMotionTransition } from "../lib/motion-config";

/**
 * Entering pages start at opacity 0.5 rather than 0, and exits are quicker than
 * enters. With AnimatePresence mode="wait" the outgoing page must finish before
 * the incoming one mounts, so a slow exit plus a from-zero enter reads as a
 * blank flash between routes. Starting half-visible shortens that gap.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const enterTransition = useMotionTransition(TRANSITIONS.pageEnter);
  const exitTransition = useMotionTransition(TRANSITIONS.pageExit);

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: enterTransition }}
      exit={{ opacity: 0, y: -10, transition: exitTransition }}
    >
      {children}
    </motion.div>
  );
}
