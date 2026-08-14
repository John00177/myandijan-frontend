import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer } from "recharts";
import { ANIMATION_DURATION, CHART_COLORS } from "../../../lib/chart-theme";
import type { SparkPoint } from "../analyticsMockData";

export type SparkKind = "line" | "bar" | "area";

interface SparklineKpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  data: SparkPoint[];
  kind: SparkKind;
}

/**
 * Recharts has no <TinyLineChart>/<TinyBarChart> components — those aren't part
 * of the library. The "tiny chart" pattern is the normal chart primitives with
 * axes, grid, tooltip and dots all omitted, which is what this does.
 */
function Sparkline({ data, kind }: { data: SparkPoint[]; kind: SparkKind }) {
  const common = {
    data,
    margin: { top: 2, right: 0, bottom: 2, left: 0 },
  };

  if (kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={40}>
        <BarChart {...common}>
          <Bar
            dataKey="v"
            fill={CHART_COLORS.primary}
            fillOpacity={0.5}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "area") {
    return (
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart {...common}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill={CHART_COLORS.primary}
            fillOpacity={0.3}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart {...common}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={false}
          animationDuration={ANIMATION_DURATION}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function SparklineKpiCard({ icon: Icon, label, value, data, kind }: SparklineKpiCardProps) {
  return (
    <div className="bg-card border border-white/[0.08] rounded-xl p-5">
      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold text-ink mt-3">{value}</div>
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-3 -mx-1">
        <Sparkline data={data} kind={kind} />
      </div>
    </div>
  );
}
