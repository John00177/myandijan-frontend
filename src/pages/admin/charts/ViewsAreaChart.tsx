import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ANIMATION_DURATION,
  CHART_COLORS,
  ChartTooltip,
  axisProps,
  gridProps,
} from "../../../lib/chart-theme";
import { VIEWS_30_DAYS } from "../analyticsMockData";
import ChartCard from "./ChartCard";

interface ViewsAreaChartProps {
  height: number;
}

export default function ViewsAreaChart({ height }: ViewsAreaChartProps) {
  return (
    <ChartCard title="Ko'rishlar dinamikasi">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={VIEWS_30_DAYS} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <defs>
            {/* Gradient fades primary 0.2 → 0 so the area reads as depth, not a block. */}
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
              <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} vertical={false} />
          <XAxis dataKey="day" {...axisProps} interval={4} />
          <YAxis {...axisProps} width={48} />
          <Tooltip
            content={<ChartTooltip suffix=" ko'rish" labelFormatter={(l) => `${l}-kun`} />}
            cursor={{ stroke: "rgba(255,255,255,0.12)" }}
          />
          <Area
            type="monotone"
            dataKey="views"
            name="Ko'rishlar"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            fill="url(#viewsGradient)"
            animationDuration={ANIMATION_DURATION}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
