import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ANIMATION_DURATION,
  CHART_COLORS,
  ChartTooltip,
  axisProps,
  gridProps,
} from "../../../lib/chart-theme";
import { USER_GROWTH_12M } from "../analyticsMockData";
import ChartCard from "./ChartCard";

interface UserGrowthChartProps {
  height: number;
  /** Legend is dropped on narrow screens where it would wrap over the title. */
  showLegend: boolean;
}

const SERIES = [
  { key: "registered", label: "Ro'yxatdan o'tgan", color: CHART_COLORS.primary },
  { key: "active", label: "Faol", color: CHART_COLORS.success },
];

export default function UserGrowthChart({ height, showLegend }: UserGrowthChartProps) {
  return (
    <ChartCard
      title="Foydalanuvchi o'sishi"
      action={
        showLegend ? (
          <div className="flex items-center gap-3 shrink-0">
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-ink-muted whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </div>
        ) : undefined
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={USER_GROWTH_12M} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={48} />
          <Tooltip content={<ChartTooltip suffix=" ta" />} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={ANIMATION_DURATION}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
