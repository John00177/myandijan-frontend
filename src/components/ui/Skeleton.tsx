import { motion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { useShouldAnimate } from "../../lib/motion-config";

export default function Skeleton({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  const shouldAnimate = useShouldAnimate();

  return (
    <div className={`relative overflow-hidden rounded-[10px] bg-white/[0.05] ${className}`} {...rest}>
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
      )}
    </div>
  );
}
