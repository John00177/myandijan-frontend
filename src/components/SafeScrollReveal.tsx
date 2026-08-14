import { motion, useAnimationControls, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TRANSITIONS, motionDebug, useMotionTransition, useShouldAnimate } from "../lib/motion-config";

/** After this long, an unrevealed section is forced visible regardless of cause. */
const SAFETY_TIMEOUT_MS = 3000;

interface SafeScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Identifier used in dev-only reveal logging. */
  label?: string;
}

/**
 * Scroll reveal that cannot leave content permanently invisible.
 *
 * The failure mode this guards against: `initial={{ opacity: 0 }}` plus a
 * viewport trigger means content is hidden until something says otherwise. If
 * IntersectionObserver never fires, the section stays invisible forever.
 *
 * Three layers, deliberately with different dependencies:
 *  1. useInView drives the normal reveal (needs IntersectionObserver).
 *  2. On timeout the component stops animating and renders plain markup. This
 *     path must NOT go through Framer: an animated fallback would need the same
 *     requestAnimationFrame loop that may be the thing that is broken, so it
 *     could fire and still leave the element at opacity 0. Rendering a plain div
 *     drops the inline styles outright and needs no frames at all.
 *  3. Under reduced motion it renders that same plain markup from the start.
 */
export default function SafeScrollReveal({ children, className, label = "section" }: SafeScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const shouldAnimate = useShouldAnimate();
  const transition = useMotionTransition(TRANSITIONS.reveal);
  const hasRevealed = useRef(false);
  const [forceVisible, setForceVisible] = useState(false);

  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // Layer 1: normal reveal once the section enters the viewport.
  useEffect(() => {
    if (!isInView || hasRevealed.current) return;
    hasRevealed.current = true;
    motionDebug(`reveal fired via viewport: ${label}`);
    void controls.start({ opacity: 1, y: 0 });
  }, [isInView, controls, label]);

  // Layer 2: safety net, independent of the animation frame loop.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (hasRevealed.current) return;
      hasRevealed.current = true;
      motionDebug(`reveal did NOT fire within ${SAFETY_TIMEOUT_MS}ms, forcing visible without animation: ${label}`);
      setForceVisible(true);
    }, SAFETY_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [label]);

  // Layers 2 and 3 share this escape hatch: plain, always-visible markup.
  if (!shouldAnimate || forceVisible) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={controls}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
