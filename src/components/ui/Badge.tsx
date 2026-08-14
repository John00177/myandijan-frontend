import type { HTMLAttributes, ReactNode } from "react";

type BadgeTone = "blue" | "cyan" | "purple" | "neutral" | "success" | "danger" | "amber";

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue: "bg-primary/[0.12] text-blue-300 border-primary/20",
  cyan: "bg-accent/[0.12] text-cyan-300 border-accent/20",
  purple: "bg-secondary/[0.12] text-purple-300 border-secondary/20",
  neutral: "bg-white/[0.05] text-ink-muted border-white/[0.10]",
  success: "bg-success/[0.12] text-success border-success/20",
  danger: "bg-danger/[0.12] text-danger border-danger/20",
  amber: "bg-warning/[0.12] text-warning border-warning/20",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

export default function Badge({ tone = "neutral", className = "", children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider border ${TONE_CLASSES[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
