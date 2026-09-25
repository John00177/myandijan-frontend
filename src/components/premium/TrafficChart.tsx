import { useState } from "react";

interface TrafficChartProps {
  /** Oldest day first; length drives the number of plotted points. */
  values: number[];
  labels: string[];
  color?: string;
  className?: string;
}

const VIEW_W = 320;
const VIEW_H = 120;
const PAD_X = 6;
const PAD_Y = 10;

/**
 * 7-day line chart, drawn as inline SVG.
 *
 * recharts is already a dependency, but it is a ~365KB chunk that today only
 * the admin analytics route pays for. Pulling it into the owner dashboard for
 * one seven-point line would be the single largest thing on the page, so this
 * draws directly instead. viewBox coordinates with preserveAspectRatio="none"
 * let it stretch to any container width without recomputing on resize.
 */
export default function TrafficChart({ values, labels, color = "#3B82F6", className = "" }: TrafficChartProps) {
  const [active, setActive] = useState<number | null>(null);

  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = (VIEW_W - PAD_X * 2) / (values.length - 1);

  const points = values.map((value, i) => {
    const x = PAD_X + i * stepX;
    const y = PAD_Y + (1 - (value - min) / span) * (VIEW_H - PAD_Y * 2);
    return { x, y, value, label: labels[i] ?? "" };
  });

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${VIEW_H} L${points[0].x.toFixed(1)},${VIEW_H} Z`;

  const activePoint = active != null ? points[active] : null;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={VIEW_W}
            y1={PAD_Y + ratio * (VIEW_H - PAD_Y * 2)}
            y2={PAD_Y + ratio * (VIEW_H - PAD_Y * 2)}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="url(#traffic-fill)" />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.map((p, i) => (
          <circle
            key={p.label + i}
            cx={p.x}
            cy={p.y}
            r={active === i ? 4 : 2.5}
            fill={active === i ? color : "#0B1120"}
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Full-height hit strips: a 2px dot is far too small a target,
            especially on touch, so each day gets the whole column. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={p.x - stepX / 2}
            y={0}
            width={stepX}
            height={VIEW_H}
            fill="transparent"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onTouchStart={() => setActive(i)}
          />
        ))}
      </svg>

      {activePoint && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-white/[0.12] bg-elevated px-2 py-1 text-[11px] font-medium text-ink shadow-lg"
          style={{ left: `${(activePoint.x / VIEW_W) * 100}%`, top: `${(activePoint.y / VIEW_H) * 140 - 6}px` }}
        >
          {activePoint.value} · {activePoint.label}
        </div>
      )}

      <div className="mt-1 flex justify-between px-1">
        {labels.map((label, i) => (
          <span key={`${label}-${i}`} className="text-[10px] text-ink-muted">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
