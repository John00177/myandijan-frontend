import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ANIMATION_DURATION,
  CHART_COLORS,
  CURSOR_FILL,
  ChartTooltip,
  axisProps,
  gridProps,
} from "../../../lib/chart-theme";
import { BUSINESSES_BY_DISTRICT } from "../analyticsMockData";
import ChartCard from "./ChartCard";

interface DistrictBarChartProps {
  height: number;
  /** Narrow viewports get less room for the category axis. */
  compact: boolean;
}

/** "Andijon tumani" and "Qurghontepa" overflow a narrow Y axis. */
function abbreviate(name: string, max: number): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export default function DistrictBarChart({ height, compact }: DistrictBarChartProps) {
  const axisWidth = compact ? 74 : 104;
  const maxChars = compact ? 9 : 14;

  return (
    <ChartCard title="Tumanlar bo'yicha bizneslar">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={BUSINESSES_BY_DISTRICT}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
          barCategoryGap="18%"
        >
          <CartesianGrid {...gridProps} horizontal={false} />
          <XAxis type="number" {...axisProps} />
          <YAxis
            type="category"
            dataKey="district"
            {...axisProps}
            width={axisWidth}
            tickFormatter={(value: string) => abbreviate(value, maxChars)}
          />
          <Tooltip content={<ChartTooltip suffix=" ta" />} cursor={{ fill: CURSOR_FILL }} />
          <Bar
            dataKey="count"
            name="Bizneslar"
            fill={CHART_COLORS.primary}
            radius={[0, 4, 4, 0]}
            animationDuration={ANIMATION_DURATION}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
