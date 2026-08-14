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
    ? "cursor-pointer hover:border-primary/40 hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(59,130,246,0.15)]"
    : "";

  return (
    <div
      // Transition is scoped to colour and shadow rather than `all`, so a CSS
      // transition can never end up animating a transform that Framer drives.
      className={`rounded-card bg-card border border-white/[0.08] shadow-card overflow-hidden transition-[border-color,box-shadow] duration-200 ${interactiveClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
