interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Any CSS colour — stroke and the fade under the line both derive from it. */
  color?: string;
  className?: string;
}

/**
 * Inline-SVG sparkline. Deliberately not a charting library: this renders at
 * ~60x20 inside a card, where axes, tooltips and a 350KB dependency would all
 * be dead weight. The dashboard's full-size chart uses recharts instead.
 */
export default function Sparkline({
  values,
  width = 64,
  height = 22,
  color = "#FFD700",
  className = "",
}: SparklineProps) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would divide by zero; drawing it through the middle is the
  // honest rendering of "no change".
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((value, i) => {
    const x = i * stepX;
    const y = height - ((value - min) / span) * height;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const gradientId = `spark-${values.join("-").slice(0, 24)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
