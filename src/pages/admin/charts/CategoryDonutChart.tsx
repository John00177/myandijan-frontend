import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_SERIES, ChartTooltip } from "../../../lib/chart-theme";
import { CATEGORY_DISTRIBUTION, TOTAL_CATEGORIES } from "../analyticsMockData";
import ChartCard from "./ChartCard";

interface CategoryDonutChartProps {
  height: number;
}

export default function CategoryDonutChart({ height }: CategoryDonutChartProps) {
  const total = CATEGORY_DISTRIBUTION.reduce((sum, c) => sum + c.value, 0);

  // Radii in pixels rather than percentage strings, derived from the known chart
  // height so the donut scales with the responsive breakpoint without relying on
  // Recharts resolving percentages against the container.
  const outerRadius = Math.round(height * 0.4);
  const innerRadius = Math.round(height * 0.28);

  return (
    <ChartCard title="Turkumlar bo'yicha taqsimot">
      {/*
        Centre text is an absolutely positioned overlay rather than a Recharts
        label: a label render-prop would have to re-derive the donut centre and
        would sit inside the SVG, where it cannot inherit the page's font stack.
        pointer-events-none keeps segment hovering intact underneath.
      */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={CATEGORY_DISTRIBUTION}
              dataKey="value"
              nameKey="name"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              stroke="none"
              /*
               * Animation off, unlike the other charts. Recharts' Pie builds its
               * sector geometry frame-by-frame off requestAnimationFrame, so if
               * frames never tick — backgrounded tab, throttled rAF — the sector
               * paths are never written and the donut renders completely blank.
               * Line/Area/Bar emit final geometry up front and are unaffected.
               * A static donut is a fair trade for one that always draws.
               */
              isAnimationActive={false}
            >
              {CATEGORY_DISTRIBUTION.map((slice, i) => (
                <Cell key={slice.name} fill={CHART_SERIES[i % CHART_SERIES.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip suffix=" ta biznes" />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-ink">{TOTAL_CATEGORIES}</span>
          <span className="text-xs text-ink-muted">ta turkum</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
        {CATEGORY_DISTRIBUTION.map((slice, i) => (
          <div key={slice.name} className="flex items-center gap-2 min-w-0">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: CHART_SERIES[i % CHART_SERIES.length] }}
            />
            <span className="text-xs text-ink-body truncate">{slice.name}</span>
            <span className="text-xs text-ink-muted ml-auto shrink-0">
              {Math.round((slice.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
