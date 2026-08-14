import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  /** Rendered top-right — usually a legend. */
  action?: ReactNode;
  children: ReactNode;
}

/** Shared frame so all four analytics charts share padding, border and heading. */
export default function ChartCard({ title, action, children }: ChartCardProps) {
  return (
    <div className="bg-card border border-white/[0.08] rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
