import type { ReactNode } from "react";

/**
 * Central Recharts theming. Named .tsx rather than .ts because the custom
 * tooltip below is a JSX component — Recharts' default tooltip renders a white
 * box, which is unusable on this dark theme, so every chart passes this instead.
 */

/** Matches the Tailwind tokens: primary, accent, secondary, success, warning, danger. */
export const CHART_COLORS = {
  primary: "#3B82F6",
  accent: "#06B6D4",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  pink: "#EC4899",
  orange: "#F97316",
} as const;

/** Categorical series palette, ordered for adjacent-segment contrast. */
export const CHART_SERIES = [
  CHART_COLORS.primary,
  CHART_COLORS.orange,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.pink,
  CHART_COLORS.warning,
  CHART_COLORS.success,
  CHART_COLORS.danger,
];

const INK_MUTED = "#94A3B8";

/** Spread onto XAxis/YAxis. */
export const axisProps = {
  tick: { fill: INK_MUTED, fontSize: 12 },
  stroke: "rgba(255,255,255,0.10)",
  tickLine: false,
} as const;

/** Spread onto CartesianGrid. */
export const gridProps = {
  strokeDasharray: "3 3",
  stroke: "rgba(255,255,255,0.06)",
} as const;

/** Kept short so charts feel responsive rather than animated. */
export const ANIMATION_DURATION = 300;

/** Hover highlight behind bars/areas; the default is a bright grey block. */
export const CURSOR_FILL = "rgba(255,255,255,0.04)";

interface TooltipPayloadEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  /** Appended to each value, e.g. " ta" or "%". */
  suffix?: string;
  /** Overrides the heading; defaults to the axis label. */
  labelFormatter?: (label: string | number | undefined) => ReactNode;
}

export function ChartTooltip({ active, payload, label, suffix = "", labelFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card border border-white/[0.08] rounded-xl p-3 shadow-card">
      {label !== undefined && (
        <div className="text-xs text-ink-muted mb-1.5">{labelFormatter ? labelFormatter(label) : label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? i}`} className="flex items-center gap-2">
            {entry.color && <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />}
            {entry.name !== undefined && <span className="text-xs text-ink-muted">{entry.name}</span>}
            <span className="text-sm font-semibold text-ink ml-auto">
              {entry.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
