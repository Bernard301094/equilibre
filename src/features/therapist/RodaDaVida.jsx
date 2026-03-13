import { useRef, useState } from "react";
import styles from "./RodaDaVida.module.css";

const AREAS = [
  "Saúde",
  "Família",
  "Relacionamento",
  "Finanças",
  "Carreira",
  "Desenvolvimento Pessoal",
  "Lazer",
  "Espiritualidade",
];

const DEFAULT_VALUES = Object.fromEntries(AREAS.map((a) => [a, 5]));

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildPolygon(values, cx, cy, maxR, total) {
  return values
    .map((v, i) => {
      const angle = (360 / total) * i;
      const r = (v / 10) * maxR;
      const p = polarToCartesian(cx, cy, r, angle);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

export default function RodaDaVida({ patientName = "Paciente" }) {
  const [values, setValues] = useState(DEFAULT_VALUES);
  const [downloading, setDownloading] = useState(false);
  const svgRef = useRef(null);

  const cx = 200;
  const cy = 200;
  const maxR = 160;
  const total = AREAS.length;
  const numericValues = AREAS.map((a) => values[a]);

  const handleChange = (area, val) => {
    setValues((prev) => ({ ...prev, [area]: Number(val) }));
  };

  const handleReset = () => setValues(DEFAULT_VALUES);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const svg = svgRef.current;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0, 400, 400);
        URL.revokeObjectURL(url);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();

        // Header
        pdf.setFillColor(106, 153, 124);
        pdf.rect(0, 0, pageW, 28, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text("Roda da Vida", pageW / 2, 12, { align: "center" });
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Paciente: ${patientName}`, pageW / 2, 21, { align: "center" });

        // Date
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(9);
        const today = new Date().toLocaleDateString("pt-BR");
        pdf.text(`Data: ${today}`, pageW / 2, 33, { align: "center" });

        // Chart
        const imgSize = 110;
        const imgX = (pageW - imgSize) / 2;
        pdf.addImage(imgData, "PNG", imgX, 38, imgSize, imgSize);

        // Scores table
        const tableY = 155;
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(50, 50, 50);
        pdf.text("Pontuações por Área", pageW / 2, tableY, { align: "center" });

        const colW = (pageW - 20) / 2;
        AREAS.forEach((area, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 10 + col * colW;
          const y = tableY + 8 + row * 10;
          const score = values[area];
          const barMaxW = colW - 30;
          const barW = (score / 10) * barMaxW;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text(area, x, y);

          // bar background
          pdf.setFillColor(230, 230, 230);
          pdf.roundedRect(x, y + 1, barMaxW, 3.5, 1, 1, "F");

          // bar fill
          const color = score >= 7 ? [76, 175, 80] : score >= 4 ? [255, 193, 7] : [244, 67, 54];
          pdf.setFillColor(...color);
          if (barW > 0) pdf.roundedRect(x, y + 1, barW, 3.5, 1, 1, "F");

          // score label
          pdf.setTextColor(60, 60, 60);
          pdf.setFontSize(9);
          pdf.text(`${score}/10`, x + barMaxW + 2, y + 4);
        });

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(160, 160, 160);
        pdf.text("Gerado por Equilibre · equilibre.app", pageW / 2, 285, { align: "center" });

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
      <div className={styles.header}>
        <h2 className={styles.title}>🌀 Roda da Vida</h2>
        <p className={styles.subtitle}>{patientName}</p>
      </div>

      <div className={styles.content}>
        {/* SVG Chart */}
        <div className={styles.chartWrapper}>
          <svg
            ref={svgRef}
            viewBox="0 0 400 400"
            width="320"
            height="320"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background circles */}
            {[2, 4, 6, 8, 10].map((level) => (
              <circle
                key={level}
                cx={cx}
                cy={cy}
                r={(level / 10) * maxR}
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="1"
              />
            ))}

            {/* Axis lines */}
            {AREAS.map((_, i) => {
              const angle = (360 / total) * i;
              const end = polarToCartesian(cx, cy, maxR, angle);
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={end.x}
                  y2={end.y}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
              );
            })}

            {/* Filled polygon */}
            <polygon
              points={buildPolygon(numericValues, cx, cy, maxR, total)}
              fill="rgba(106,153,124,0.35)"
              stroke="#6a997c"
              strokeWidth="2"
            />

            {/* Dots */}
            {numericValues.map((v, i) => {
              const angle = (360 / total) * i;
              const r = (v / 10) * maxR;
              const p = polarToCartesian(cx, cy, r, angle);
              return (
                <circle key={i} cx={p.x} cy={p.y} r={4} fill="#6a997c" stroke="#fff" strokeWidth="1.5" />
              );
            })}

            {/* Labels */}
            {AREAS.map((area, i) => {
              const angle = (360 / total) * i;
              const p = polarToCartesian(cx, cy, maxR + 22, angle);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fill="#444"
                  fontFamily="sans-serif"
                >
                  {area}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Sliders */}
        <div className={styles.sliders}>
          {AREAS.map((area) => (
            <div key={area} className={styles.sliderRow}>
              <span className={styles.areaLabel}>{area}</span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={values[area]}
                onChange={(e) => handleChange(area, e.target.value)}
                className={styles.range}
              />
              <span className={styles.score}>{values[area]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={handleReset} className={styles.btnReset}>
          Resetar
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className={styles.btnPdf}
        >
          {downloading ? "Gerando PDF..." : "⬇ Baixar PDF"}
        </button>
      </div>
    </div>
  );
}
