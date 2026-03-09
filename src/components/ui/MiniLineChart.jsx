import { memo, useState } from "react";
import "./MiniLineChart.css";

const MiniLineChart = memo(function MiniLineChart({
  points = [],
  labels = [],
  color  = "var(--sage-dark)",
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

  const smoothPath = points.reduce((path, v, i) => {
    if (i === 0) return `M ${cx(0).toFixed(1)},${cy(v).toFixed(1)}`;
    const prev = points[i - 1];
    const cpx1 = (cx(i - 1) + cx(i)) / 2;
    const cpx2 = cpx1;
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

  const gradId = `grad-${Math.abs(color.split("").reduce((a, c) => a + c.charCodeAt(0), 0))}`;
  const glowId = `glow-${gradId}`;

  return (
    <div className="mlc">

      {/* Tooltip */}
      {hovered !== null && (
        <div
          className="mlc__tooltip"
          style={{ left: `${(cx(hovered) / 600) * 100}%` }}
        >
          <div className="mlc__tooltip-value">{points[hovered]}</div>
          {labels[hovered] && (
            <div className="mlc__tooltip-label">{labels[hovered]}</div>
          )}
          <div className="mlc__tooltip-arrow" />
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mlc__svg"
        style={{ height }}
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
                stroke="var(--warm)"
                strokeWidth="1"
                strokeDasharray="4 6"
                opacity="0.5"
              />
              <text
                x={paddingX - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="9"
                fill="var(--text-muted)"
                fontFamily="DM Sans, sans-serif"
                opacity="0.7"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Glow line */}
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

        {/* Invisible hit areas */}
        {points.map((v, i) => (
          <rect
            key={`hit-${i}`}
            x={cx(i) - (chartW / (points.length - 1)) / 2}
            y={paddingTop}
            width={chartW / (points.length - 1)}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            className="mlc__hit-area"
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
              cx={cx(i)} cy={cy(v)}
              r={hovered === i ? 5.5 : 4}
              fill="white"
              stroke={color}
              strokeWidth="2.5"
              className="mlc__point"
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
            fontSize="10"
            fill={hovered === i ? color : "var(--text-muted)"}
            fontFamily="DM Sans, sans-serif"
            fontWeight={hovered === i ? "700" : "400"}
            className="mlc__x-label"
          >
            {labels[i] ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
});

export default MiniLineChart;