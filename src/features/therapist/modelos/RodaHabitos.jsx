import { useRef, useState } from "react";
import styles from "./Modelo.module.css";

const DEFAULT_HABITS = [
  { key: "0", label: "Sono" },
  { key: "1", label: "Exercício" },
  { key: "2", label: "Alimentação" },
  { key: "3", label: "Hidratação" },
  { key: "4", label: "Lazer" },
  { key: "5", label: "Meditаção" },
  { key: "6", label: "Sociabilidade" },
  { key: "7", label: "Produtividade" },
];

const HABIT_COLORS = [
  "#7b9fd4", "#4cbb6e", "#e0b96a", "#5bb8b8",
  "#e07bb8", "#9b7be0", "#e07b7b", "#a0b86a",
];

const CX = 190, CY = 190, MAX_R = 145;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startAngle, endAngle) {
  if (r <= 0) return "";
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}

export default function RodaHabitos({ patientName = "Paciente" }) {
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [values, setValues] = useState(Object.fromEntries(DEFAULT_HABITS.map(h => [h.key, 5])));
  const [editingKey, setEditingKey] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const svgRef = useRef(null);

  const total = habits.length;
  const sliceAngle = 360 / total;

  const handleReset = () => { setHabits(DEFAULT_HABITS); setValues(Object.fromEntries(DEFAULT_HABITS.map(h => [h.key, 5]))); setEditingKey(null); };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const svg = svgRef.current;
      const svgStr = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 380; canvas.height = 380;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 380, 380);
        ctx.drawImage(img, 0, 0, 380, 380);
        URL.revokeObjectURL(url);
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const today = new Date().toLocaleDateString("pt-BR");
        pdf.setFillColor(90, 140, 110); pdf.rect(0, 0, pageW, 32, "F");
        pdf.setFillColor(106, 153, 124); pdf.rect(0, 16, pageW, 16, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20); pdf.setFont("helvetica", "bold"); pdf.text("Roda dos Hábitos", pageW / 2, 13, { align: "center" });
        pdf.setFontSize(10); pdf.setFont("helvetica", "normal"); pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });
        pdf.addImage(imgData, "PNG", (pageW - 108) / 2, 36, 108, 108);
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(60, 60, 60);
        pdf.text("Pontuações por Hábito", 14, 150); pdf.setDrawColor(200, 200, 200); pdf.line(14, 152, pageW - 14, 152);
        const colW = (pageW - 28) / 2;
        habits.forEach((h, i) => {
          const col = i % 2, row = Math.floor(i / 2);
          const x = 14 + col * (colW + 4), y = 158 + row * 13;
          const score = values[h.key];
          const barMaxW = colW - 18, barW = (score / 10) * barMaxW;
          const rgb = hexToRgb(HABIT_COLORS[i] || "#7b9fd4");
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(60, 60, 60); pdf.text(h.label, x, y);
          pdf.setFillColor(235, 235, 235); pdf.roundedRect(x, y + 1.5, barMaxW, 4, 1.5, 1.5, "F");
          if (barW > 0) { pdf.setFillColor(rgb.r, rgb.g, rgb.b); pdf.roundedRect(x, y + 1.5, barW, 4, 1.5, 1.5, "F"); }
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(rgb.r, rgb.g, rgb.b); pdf.text(`${score}`, x + barMaxW + 2, y + 5);
        });
        pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
        pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
        pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
        pdf.save(`roda_habitos_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
        setDownloading(false);
      };
      img.src = url;
    } catch (err) { console.error(err); setDownloading(false); }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🏃 Roda dos Hábitos</h2>
          <p className={styles.subtitle}>Avalie o equilíbrio dos hábitos saudáveis do paciente</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleReset} className={styles.btnReset}>Resetar</button>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>{downloading ? "Gerando..." : "⬇ Baixar PDF"}</button>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.chartWrapper}>
          <svg ref={svgRef} viewBox="0 0 380 380" width="360" height="360" xmlns="http://www.w3.org/2000/svg">
            {[10,8,6,4,2].map((level,li) => <circle key={level} cx={CX} cy={CY} r={(level/10)*MAX_R} fill={li===0?"#f9fafb":"none"} stroke="#e2e8e4" strokeWidth="0.8"/>)}
            {[2,4,6,8,10].map(level => <text key={level} x={CX+4} y={CY-(level/10)*MAX_R+4} fontSize="8" fill="#bbb" fontFamily="sans-serif">{level}</text>)}
            {habits.map((_,i) => { const end=polarToCartesian(CX,CY,MAX_R,sliceAngle*i); return <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#d0d8d3" strokeWidth="0.8" strokeDasharray="3,3"/>; })}
            {habits.map((h,i) => { const r=(values[h.key]/10)*MAX_R; const d=slicePath(CX,CY,r,sliceAngle*i,sliceAngle*(i+1)); return d?<path key={h.key} d={d} fill={HABIT_COLORS[i]} fillOpacity="0.38" stroke={HABIT_COLORS[i]} strokeWidth="1.5" strokeLinejoin="round"/>:null; })}
            {habits.map((h,i) => { const p=polarToCartesian(CX,CY,(values[h.key]/10)*MAX_R,sliceAngle*i); return <g key={h.key}><circle cx={p.x} cy={p.y} r={7} fill={HABIT_COLORS[i]} stroke="#fff" strokeWidth="2"/><text x={p.x} y={p.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#fff" fontFamily="sans-serif" fontWeight="bold">{values[h.key]}</text></g>; })}
            {habits.map((h,i) => { const angle=sliceAngle*i; const p=polarToCartesian(CX,CY,MAX_R+26,angle); const words=h.label.split(" "); const mid=Math.ceil(words.length/2); const line1=words.slice(0,mid).join(" "); const line2=words.slice(mid).join(" "); return <text key={h.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill={HABIT_COLORS[i]} fontFamily="sans-serif" fontWeight="600">{words.length>2?<tspan><tspan x={p.x} dy="-6">{line1}</tspan><tspan x={p.x} dy="13">{line2}</tspan></tspan>:h.label}</text>; })}
          </svg>
        </div>
        <div className={styles.sliders}>
          {habits.map((h, i) => (
            <div key={h.key} className={styles.sliderRow}>
              <div className={styles.labelWrapper}>
                <span className={styles.colorDot} style={{ background: HABIT_COLORS[i] }} />
                {editingKey === h.key ? (
                  <input autoFocus className={styles.labelInput} value={h.label} onChange={e => setHabits(prev => prev.map(a => a.key===h.key?{...a,label:e.target.value}:a))} onBlur={() => setEditingKey(null)} onKeyDown={e => e.key==="Enter"&&setEditingKey(null)} maxLength={24} />
                ) : (
                  <span className={styles.areaLabel} onClick={() => setEditingKey(h.key)} title="Clique para editar">{h.label} <span className={styles.editHint}>✏️</span></span>
                )}
              </div>
              <div className={styles.rangeWrapper}>
                <input type="range" min={0} max={10} step={1} value={values[h.key]} onChange={e => setValues(p => ({...p,[h.key]:Number(e.target.value)}))} className={styles.range} style={{ accentColor: HABIT_COLORS[i] }} />
                <span className={styles.score} style={{ color: HABIT_COLORS[i] }}>{values[h.key]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
