import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  STAGGER_ITEM_VARIANTS,
  TRANSITIONS,
  staggerContainerVariants,
  useMotionTransition,
  useShouldAnimate,
} from "../lib/motion-config";

interface StaggerContainerProps {
  children: ReactNode;
  /** Grid/flex classes belong here so layout is preserved on the animated element. */
  className?: string;
  stagger?: number;
}

export default function StaggerContainer({ children, className, stagger = 0.05 }: StaggerContainerProps) {
  const shouldAnimate = useShouldAnimate();

  // Under reduced motion render plain markup: no hidden initial state at all,
  // so there is no way for content to be left invisible.
  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants(stagger)}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const transition = useMotionTransition(TRANSITIONS.staggerItem);
  const shouldAnimate = useShouldAnimate();

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={STAGGER_ITEM_VARIANTS} transition={transition}>
      {children}
    </motion.div>
  );
}
