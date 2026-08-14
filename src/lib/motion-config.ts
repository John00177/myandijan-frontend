import { useReducedMotion, type Transition, type Variants } from "framer-motion";

/** Shared easing curve for page transitions and scroll reveals. */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Applied whenever motion is suppressed: state changes land instantly. */
export const INSTANT: Transition = { duration: 0 };

/**
 * Named presets. Every motion component imports from here rather than
 * hardcoding numbers, so timing is tuned in one place.
 *
 * `spring` is physics-based (interruptible, ideal for hover gestures).
 * `modalSpring` and `indicatorSpring` are duration-based springs: they keep the
 * spring feel but are guaranteed to settle within a bounded time, so a slow CPU
 * or a throttled frame loop cannot leave them stranded mid-flight.
 */
export const TRANSITIONS = {
  fast: { duration: 0.15, ease: EASE_OUT_EXPO } as Transition,
  smooth: { duration: 0.3, ease: EASE_OUT_EXPO } as Transition,
  spring: { type: "spring", stiffness: 300, damping: 25 } as Transition,
  modalSpring: { type: "spring", duration: 0.4, bounce: 0.3 } as Transition,
  indicatorSpring: { type: "spring", duration: 0.35, bounce: 0.2 } as Transition,
  pageEnter: { duration: 0.2, ease: EASE_OUT_EXPO } as Transition,
  pageExit: { duration: 0.1, ease: EASE_OUT_EXPO } as Transition,
  reveal: { duration: 0.5, ease: EASE_OUT_EXPO } as Transition,
  staggerItem: { duration: 0.3, ease: EASE_OUT_EXPO } as Transition,
  hero: { duration: 0.6, ease: EASE_OUT_EXPO } as Transition,
} as const;

/**
 * Non-reactive read of the OS preference, for use outside React (module init,
 * event handlers). Exported as a function rather than a bare `shouldAnimate`
 * constant on purpose: a constant captured at import time cannot notice the
 * user changing the preference mid-session. Components should use
 * useShouldAnimate() so they re-render when it flips.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Reactive: true when animations should play, false when they must be instant. */
export function useShouldAnimate(): boolean {
  return !useReducedMotion();
}

/** Returns the transition, or an instant one under reduced motion. */
export function useMotionTransition(transition: Transition): Transition {
  const shouldAnimate = useShouldAnimate();
  return shouldAnimate ? transition : INSTANT;
}

/** Stagger container variants; stagger is zeroed under reduced motion. */
export function staggerContainerVariants(stagger: number): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger } },
  };
}

export const STAGGER_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/** Dev-only tracing for reveal diagnostics; stripped from production builds. */
export function motionDebug(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log("[motion]", ...args);
  }
}
