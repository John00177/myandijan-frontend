import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useShouldAnimate } from "../lib/motion-config";

const DURATION_MS = 1500;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Counts 0 -> target once the returned ref scrolls into view. Runs once
 * (viewport re-entry doesn't restart it) and skips the animation entirely
 * under reduced motion, landing straight on target.
 */
export function useCountUp(target: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const shouldAnimate = useShouldAnimate();
  const [value, setValue] = useState(shouldAnimate ? 0 : target);

  useEffect(() => {
    if (!inView) return;
    if (!shouldAnimate) {
      setValue(target);
      return;
    }

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      setValue(Math.round(easeOut(progress) * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, target]);

  return { ref, value };
}
