import { memo, useState } from "react";
import "./MiniLineChart.css";

const MiniLineChart = memo(function MiniLineChart({
  points = [],
  labels = [],
  color  = "var(--blue-mid)",
  height = 140,
}) {
  const [hovered, setHovered] = useState(null);

  const strokeColor = color;
  const gridColor   = "var(--warm)";
  const axisColor   = "var(--text-muted)";
  const areaAlpha   = "0.2";
  const areaAlphaEnd = "0";

  if (!points || points.length < 2) return null;

  const W          = 600;
  const H          = height;
  
  // Aumentado para 60 para dar total liberdade aos números na esquerda
  const paddingX   = 60; 
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
    const cpx  = (cx(i - 1) + cx(i)) / 2;
    return `${path} C ${cpx.toFixed(1)},${cy(prev).toFixed(1)} ${cpx.toFixed(1)},${cy(v).toFixed(1)} ${cx(i).toFixed(1)},${cy(v).toFixed(1)}`;
  }, "");

  const areaPath =
    `${smoothPath}` +
    ` L ${cx(points.length - 1).toFixed(1)},${(paddingTop + chartH).toFixed(1)}` +
    ` L ${cx(0).toFixed(1)},${(paddingTop + chartH).toFixed(1)} Z`;

  // Controla a densidade de datas no eixo X
  const stepX    = Math.ceil(points.length / 5);
  const showIdxs = points.map((_, i) => i).filter(
    (i) => i % stepX === 0 || i === points.length - 1
  );

  const uid    = Math.abs((strokeColor + height).toString().split("").reduce((a, c) => a + c.charCodeAt(0), 0));

  return (
    <div className="mlc">
      {hovered !== null && (
        <div className="mlc__tooltip" style={{ left: `${(cx(hovered) / 600) * 100}%` }}>
          <div className="mlc__tooltip-value">{points[hovered]}</div>
          {labels[hovered] && <div className="mlc__tooltip-label">{labels[hovered]}</div>}
          <div className="mlc__tooltip-arrow" />
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} className="mlc__svg" style={{ height }} aria-hidden="true" onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id={`grad-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={strokeColor} stopOpacity={areaAlpha} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={areaAlphaEnd} />
          </linearGradient>
        </defs>

        {/* Eixo Y: Mostra 0, 50% e 100% da amplitude dos dados atuais */}
        {[0, 0.5, 1].map((t) => {
          const y = paddingTop + chartH * (1 - t);
          const v = (min + span * t).toFixed(span > 5 ? 0 : 1); // Mostra decimal apenas se o intervalo for pequeno
          return (
            <g key={t}>
              <line x1={paddingX} y1={y} x2={W - paddingX} y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
              <text 
                x={paddingX - 20} // Afastado 20px da linha
                y={y} 
                textAnchor="end" 
                dominantBaseline="central" // Alinhamento vertical perfeito
                fontSize="14" 
                fill={axisColor} 
                fontFamily="DM Sans, sans-serif" 
                fontWeight="700"
              >
                {v}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill={`url(#grad-${uid})`} />
        <path d={smoothPath} fill="none" stroke={strokeColor} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((v, i) => (
          <circle
            key={`pt-${i}`}
            cx={cx(i)} cy={cy(v)}
            r={hovered === i ? 6.5 : 4.5}
            fill="var(--card)" 
            stroke={strokeColor}
            strokeWidth="2.5"
            onMouseEnter={() => setHovered(i)}
            style={{ cursor: 'pointer', transition: 'r 0.2s ease' }}
          />
        ))}

        {showIdxs.map((i) => (
          <text 
            key={`lbl-${i}`} 
            x={cx(i)} 
            y={H - 6} 
            textAnchor="middle" 
            fontSize="13" 
            fill={hovered === i ? strokeColor : axisColor} 
            fontFamily="DM Sans, sans-serif" 
            fontWeight={hovered === i ? "800" : "600"}
          >
            {labels[i] ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
});

export default MiniLineChart;