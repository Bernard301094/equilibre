import { useRef, useState } from "react";
import styles from "./RodaDaVida.module.css";

const DEFAULT_AREAS = [
  { key: "0", label: "Saúde" },
  { key: "1", label: "Família" },
  { key: "2", label: "Relacionamento" },
  { key: "3", label: "Finanças" },
  { key: "4", label: "Carreira" },
  { key: "5", label: "Desenvolvimento Pessoal" },
  { key: "6", label: "Lazer" },
  { key: "7", label: "Espiritualidade" },
];

const AREA_COLORS = [
  "#6a997c", "#7b9fd4", "#e07b7b", "#e0b96a",
  "#9b7be0", "#5bb8b8", "#e07bb8", "#a0b86a",
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildPolygonPoints(values, areas, cx, cy, maxR) {
  return areas
    .map((a, i) => {
      const angle = (360 / areas.length) * i;
      const r = (values[a.key] / 10) * maxR;
      const p = polarToCartesian(cx, cy, r, angle);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

export default function RodaDaVida({ patientName = "Paciente" }) {
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [values, setValues] = useState(
    Object.fromEntries(DEFAULT_AREAS.map((a) => [a.key, 5]))
  );
  const [editingKey, setEditingKey] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const svgRef = useRef(null);

  const cx = 190; const cy = 190; const maxR = 145;
  const total = areas.length;

  const handleValueChange = (key, val) =>
    setValues((prev) => ({ ...prev, [key]: Number(val) }));

  const handleLabelChange = (key, newLabel) =>
    setAreas((prev) => prev.map((a) => a.key === key ? { ...a, label: newLabel } : a));

  const handleReset = () => {
    setAreas(DEFAULT_AREAS);
    setValues(Object.fromEntries(DEFAULT_AREAS.map((a) => [a.key, 5])));
    setEditingKey(null);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const svg = svgRef.current;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 380; canvas.height = 380;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 380, 380);
        ctx.drawImage(img, 0, 0, 380, 380);
        URL.revokeObjectURL(url);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const today = new Date().toLocaleDateString("pt-BR");

        // Header gradient simulation
        pdf.setFillColor(90, 140, 110);
        pdf.rect(0, 0, pageW, 32, "F");
        pdf.setFillColor(106, 153, 124);
        pdf.rect(0, 16, pageW, 16, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont("helvetica", "bold");
        pdf.text("Roda da Vida", pageW / 2, 13, { align: "center" });
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

        // Chart
        const imgSize = 108;
        pdf.addImage(imgData, "PNG", (pageW - imgSize) / 2, 36, imgSize, imgSize);

        // Section title
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(60, 60, 60);
        pdf.text("Pontuações por Área", 14, 150);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(14, 152, pageW - 14, 152);

        // Score bars
        const colW = (pageW - 28) / 2;
        areas.forEach((area, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 14 + col * (colW + 4);
          const y = 158 + row * 13;
          const score = values[area.key];
          const barMaxW = colW - 18;
          const barW = (score / 10) * barMaxW;
          const color = AREA_COLORS[i] || "#6a997c";
          const rgb = hexToRgb(color);

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(60, 60, 60);
          pdf.text(area.label, x, y);

          pdf.setFillColor(235, 235, 235);
          pdf.roundedRect(x, y + 1.5, barMaxW, 4, 1.5, 1.5, "F");

          if (barW > 0) {
            pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            pdf.roundedRect(x, y + 1.5, barW, 4, 1.5, 1.5, "F");
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.setTextColor(rgb.r, rgb.g, rgb.b);
          pdf.text(`${score}`, x + barMaxW + 2, y + 5);
        });

        // Footer
        pdf.setFillColor(245, 245, 245);
        pdf.rect(0, 278, pageW, 20, "F");
        pdf.setFontSize(7.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(150, 150, 150);
        pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });

        const safeName = patientName.replace(/\s+/g, "_");
        pdf.save(`roda_da_vida_${safeName}_${today.replace(/\//g, "-")}.pdf`);
        setDownloading(false);
      };
      img.src = url;
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      setDownloading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🌀 Roda da Vida</h2>
          <p className={styles.subtitle}>Clique nos rótulos para editar as áreas</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleReset} className={styles.btnReset}>Resetar</button>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
            {downloading ? "Gerando..." : "⬇ Baixar PDF"}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* SVG Chart */}
        <div className={styles.chartWrapper}>
          <svg
            ref={svgRef}
            viewBox="0 0 380 380"
            width="360"
            height="360"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {areas.map((a, i) => (
                <radialGradient key={a.key} id={`grad${a.key}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={AREA_COLORS[i]} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={AREA_COLORS[i]} stopOpacity="0.15" />
                </radialGradient>
              ))}
            </defs>

            {/* Background fills per level */}
            {[10, 8, 6, 4, 2].map((level, li) => (
              <circle
                key={level}
                cx={cx} cy={cy}
                r={(level / 10) * maxR}
                fill={li === 0 ? "#f9fafb" : "none"}
                stroke="#e2e8e4"
                strokeWidth="0.8"
              />
            ))}

            {/* Level labels */}
            {[2, 4, 6, 8, 10].map((level) => (
              <text
                key={level}
                x={cx + 4}
                y={cy - (level / 10) * maxR + 4}
                fontSize="8"
                fill="#aaa"
                fontFamily="sans-serif"
              >{level}</text>
            ))}

            {/* Axis lines */}
            {areas.map((_, i) => {
              const angle = (360 / total) * i;
              const end = polarToCartesian(cx, cy, maxR, angle);
              return (
                <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
                  stroke="#d0d8d3" strokeWidth="1" strokeDasharray="3,3" />
              );
            })}

            {/* Filled polygon with gradient */}
            <polygon
              points={buildPolygonPoints(values, areas, cx, cy, maxR)}
              fill="rgba(106,153,124,0.22)"
              stroke="#6a997c"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Dots with color per area */}
            {areas.map((a, i) => {
              const angle = (360 / total) * i;
              const r = (values[a.key] / 10) * maxR;
              const p = polarToCartesian(cx, cy, r, angle);
              return (
                <g key={a.key}>
                  <circle cx={p.x} cy={p.y} r={6} fill={AREA_COLORS[i]} stroke="#fff" strokeWidth="2" />
                  <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize="7" fill="#fff" fontFamily="sans-serif" fontWeight="bold">
                    {values[a.key]}
                  </text>
                </g>
              );
            })}

            {/* Labels outside */}
            {areas.map((a, i) => {
              const angle = (360 / total) * i;
              const p = polarToCartesian(cx, cy, maxR + 24, angle);
              const words = a.label.split(" ");
              return (
                <text key={a.key} x={p.x} y={p.y} textAnchor="middle"
                  dominantBaseline="middle" fontSize="10" fill="#3a3a3a"
                  fontFamily="sans-serif" fontWeight="500">
                  {words.length > 2 ? (
                    <>
                      <tspan x={p.x} dy="-6">{words.slice(0, Math.ceil(words.length/2)).join(" ")}</tspan>
                      <tspan x={p.x} dy="12">{words.slice(Math.ceil(words.length/2)).join(" ")}</tspan>
                    </>
                  ) : a.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Sliders */}
        <div className={styles.sliders}>
          {areas.map((area, i) => (
            <div key={area.key} className={styles.sliderRow}>
              <div className={styles.labelWrapper}>
                <span
                  className={styles.colorDot}
                  style={{ background: AREA_COLORS[i] }}
                />
                {editingKey === area.key ? (
                  <input
                    autoFocus
                    className={styles.labelInput}
                    value={area.label}
                    onChange={(e) => handleLabelChange(area.key, e.target.value)}
                    onBlur={() => setEditingKey(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingKey(null)}
                    maxLength={24}
                  />
                ) : (
                  <span
                    className={styles.areaLabel}
                    onClick={() => setEditingKey(area.key)}
                    title="Clique para editar"
                  >
                    {area.label} <span className={styles.editHint}>✏️</span>
                  </span>
                )}
              </div>
              <div className={styles.rangeWrapper}>
                <input
                  type="range" min={0} max={10} step={1}
                  value={values[area.key]}
                  onChange={(e) => handleValueChange(area.key, e.target.value)}
                  className={styles.range}
                  style={{ accentColor: AREA_COLORS[i] }}
                />
                <span className={styles.score} style={{ color: AREA_COLORS[i] }}>
                  {values[area.key]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
