import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Colour/shadow hover affordance. Deliberately contains no transform:
   * transforms are owned by AnimatedCard's spring. If this preset also applied
   * hover:-translate-y / active:scale, the two would stack (a ~-6px lift) and a
   * 200ms CSS transition would race the spring, which reads as sluggish.
   */
  interactive?: boolean;
  children: ReactNode;
}

export default function Card({ interactive = false, className = "", children, ...rest }: CardProps) {
  const interactiveClasses = interactive
    ? "cursor-pointer hover:border-white/[0.15] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
    : "";

  return (
    <div
      // Glassmorphism: translucent bg + backdrop-blur instead of the old solid
      // bg-card. Transition stays scoped to colour/shadow (not `all`/transform)
      // so a CSS transition can never race the Framer spring AnimatedCard drives.
      className={`rounded-card bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden transition-[border-color,box-shadow] duration-300 ${interactiveClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
