import { memo, useState } from "react";
import "./MiniLineChart.css";

const MiniLineChart = memo(function MiniLineChart({
  points = [],
  labels = [],
  color  = "var(--color-brand-base)",
  height = 140,
}) {
  const [hovered, setHovered] = useState(null);

  if (!points || points.length < 2) return null;

  const W          = 600;
  const H          = height;
  const paddingX   = 20;
  const paddingTop = 36;
  const paddingBot = 32;
  const chartH     = H - paddingTop - paddingBot;
  const chartW     = W - paddingX * 2;

  const min  = Math.min(...points);
  const max  = Math.max(...points);
  const span = max - min || 1;

  const cx = (i) => paddingX + (i / (points.length - 1)) * chartW;
  const cy = (v) => paddingTop + chartH - ((v - min) / span) * chartH;

  // Curva suave usando bezier cúbico
  const smoothPath = points.reduce((path, v, i) => {
    if (i === 0) return `M ${cx(0).toFixed(1)},${cy(v).toFixed(1)}`;
    const prev  = points[i - 1];
    const cpx1  = (cx(i - 1) + cx(i)) / 2;
    const cpx2  = cpx1;
    return `${path} C ${cpx1.toFixed(1)},${cy(prev).toFixed(1)} ${cpx2.toFixed(1)},${cy(v).toFixed(1)} ${cx(i).toFixed(1)},${cy(v).toFixed(1)}`;
  }, "");

  const areaPath =
    `${smoothPath}` +
    ` L ${cx(points.length - 1).toFixed(1)},${(paddingTop + chartH).toFixed(1)}` +
    ` L ${cx(0).toFixed(1)},${(paddingTop + chartH).toFixed(1)} Z`;

  const step     = Math.ceil(points.length / 6);
  const showIdxs = points.map((_, i) => i).filter(
    (i) => i % step === 0 || i === points.length - 1
  );

  const gradId   = `grad-${Math.abs(color.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  const glowId   = `glow-${gradId}`;

  return (
    <div className="mini-chart-wrapper" style={{ "--chart-color": color }}>
      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="mini-chart-tooltip"
          style={{ "--tooltip-left": `${(cx(hovered) / 600) * 100}%` }}
        >
          <div className="mini-chart-tooltip-val">{points[hovered]}</div>
          {labels[hovered] && (
            <div className="mini-chart-tooltip-label">
              {labels[hovered]}
            </div>
          )}
          <div className="mini-chart-tooltip-caret" />
        </div>
      )}

      <svg
        className="mini-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        style={{ "--chart-height": `${height}px` }}
        aria-hidden="true"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = paddingTop + chartH * (1 - t);
          const v = Math.round(min + span * t);
          return (
            <g key={t}>
              <line
                x1={paddingX} y1={y} x2={W - paddingX} y2={y}
                stroke="var(--color-surface-hover)"
                strokeWidth="1"
                strokeDasharray="4 6"
                opacity="0.8"
              />
              <text
                x={paddingX - 6}
                y={y + 4}
                textAnchor="end"
                className="mini-chart-axis-text"
                fontSize="10"
                fill="var(--color-text-muted)"
                opacity="0.8"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Glow line (blurred duplicate) */}
        <path
          d={smoothPath}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.25"
          filter={`url(#${glowId})`}
        />

        {/* Main line */}
        <path
          d={smoothPath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Invisible hit areas for hover */}
        {points.map((v, i) => (
          <rect
            key={`hit-${i}`}
            x={cx(i) - (chartW / (points.length - 1)) / 2}
            y={paddingTop}
            width={chartW / (points.length - 1)}
            height={chartH}
            className="mini-chart-hitbox"
            onMouseEnter={() => setHovered(i)}
          />
        ))}

        {/* Vertical line on hover */}
        {hovered !== null && (
          <line
            x1={cx(hovered)} y1={paddingTop}
            x2={cx(hovered)} y2={paddingTop + chartH}
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.5"
          />
        )}

        {/* Points */}
        {points.map((v, i) => (
          <g key={`pt-${i}`}>
            {hovered === i && (
              <circle
                cx={cx(i)} cy={cy(v)} r="10"
                fill={color} opacity="0.12"
              />
            )}
            <circle
              className="mini-chart-point"
              cx={cx(i)} cy={cy(v)}
              r={hovered === i ? 5.5 : 4}
              fill="var(--color-surface-card)"
              stroke={color}
              strokeWidth="2.5"
            />
          </g>
        ))}

        {/* X-axis labels */}
        {showIdxs.map((i) => (
          <text
            key={`lbl-${i}`}
            x={cx(i)}
            y={H - 6}
            textAnchor="middle"
            className="mini-chart-axis-label"
            fontSize="10"
            fill={hovered === i ? color : "var(--color-text-muted)"}
            fontWeight={hovered === i ? "700" : "500"}
          >
            {labels[i] ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
});

export default MiniLineChart;