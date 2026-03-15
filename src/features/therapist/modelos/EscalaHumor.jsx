import { useState } from "react";
import styles from "./Modelo.module.css";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const EMOTIONS = [
  { emoji: "😢", label: "Muito triste" },
  { emoji: "😟", label: "Triste" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "🙂", label: "Bem" },
  { emoji: "😄", label: "Muito bem" },
];
const HUMOR_COLORS = ["#e07b7b", "#e0a96a", "#e0d06a", "#7bd47e", "#4cbb6e"];

export default function EscalaHumor({ patientName = "Paciente" }) {
  const [values, setValues] = useState(Object.fromEntries(DAYS.map(d => [d, null])));
  const [notes, setNotes] = useState(Object.fromEntries(DAYS.map(d => [d, ""])));
  const [downloading, setDownloading] = useState(false);

  const filled = Object.values(values).filter(v => v !== null);
  const avg = filled.length ? (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1) : null;
  const avgColor = avg !== null ? HUMOR_COLORS[Math.round(avg) - 1] || HUMOR_COLORS[2] : "#999";

  const handleReset = () => {
    setValues(Object.fromEntries(DAYS.map(d => [d, null])));
    setNotes(Object.fromEntries(DAYS.map(d => [d, ""])));
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const today = new Date().toLocaleDateString("pt-BR");

      pdf.setFillColor(90, 140, 110); pdf.rect(0, 0, pageW, 32, "F");
      pdf.setFillColor(106, 153, 124); pdf.rect(0, 16, pageW, 16, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20); pdf.setFont("helvetica", "bold");
      pdf.text("Escala de Humor Semanal", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      DAYS.forEach((day) => {
        const v = values[day];
        const emo = v !== null ? EMOTIONS[v - 1] : null;
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text(day, 14, y);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 100, 100);
        pdf.text(emo ? `${emo.label} (${v}/5)` : "Não registrado", 60, y);
        if (notes[day]) {
          pdf.setFontSize(8.5);
          const noteLines = pdf.splitTextToSize(`Nota: ${notes[day]}`, pageW - 28);
          y += 5;
          pdf.text(noteLines, 18, y);
          y += noteLines.length * 4.5;
        }
        y += 8;
      });

      if (avg !== null) {
        y += 2;
        pdf.setFillColor(240, 248, 244); pdf.roundedRect(14, y, pageW - 28, 18, 4, 4, "F");
        pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
        pdf.text(`Média semanal: ${avg} / 5`, 14 + 8, y + 11);
      }

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`humor_semanal_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>📊 Escala de Humor Semanal</h2>
          <p className={styles.subtitle}>Registre o nível de humor de cada dia da semana</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleReset} className={styles.btnReset}>Resetar</button>
          <button onClick={handleDownloadPDF} disabled={downloading || filled.length === 0} className={styles.btnPdf}>
            {downloading ? "Gerando..." : "⬇ Baixar PDF"}
          </button>
        </div>
      </div>

      {avg !== null && (
        <div className={styles.avgBanner} style={{ borderColor: avgColor, background: avgColor + "18" }}>
          <span className={styles.avgEmoji}>{EMOTIONS[Math.round(avg) - 1]?.emoji || "😐"}</span>
          <div>
            <span className={styles.avgLabel} style={{ color: avgColor }}>Média semanal: {avg}/5</span>
            <span className={styles.avgSub}>{EMOTIONS[Math.round(avg) - 1]?.label}</span>
          </div>
        </div>
      )}

      <div className={styles.humorChart}>
        {DAYS.map(day => (
          <div key={day} className={styles.humorCol}>
            <span className={styles.humorDay}>{day.slice(0, 3)}</span>
            <div className={styles.humorBar}>
              {[5, 4, 3, 2, 1].map(level => (
                <button
                  key={level}
                  className={`${styles.humorCell} ${values[day] === level ? styles.humorActive : ""}`}
                  style={values[day] === level ? { background: HUMOR_COLORS[level - 1], borderColor: HUMOR_COLORS[level - 1] } : {}}
                  onClick={() => setValues(p => ({ ...p, [day]: level }))}
                  title={EMOTIONS[level - 1].label}
                >
                  {values[day] === level && <span>{EMOTIONS[level - 1].emoji}</span>}
                </button>
              ))}
            </div>
            <span className={styles.humorVal} style={{ color: values[day] ? HUMOR_COLORS[values[day] - 1] : "#ccc" }}>
              {values[day] ?? "—"}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.notesGrid}>
        {DAYS.map(day => (
          <div key={day} className={styles.noteItem}>
            <label className={styles.noteLabel}>{day}</label>
            <input
              className={styles.noteInput}
              placeholder="Nota opcional..."
              value={notes[day]}
              onChange={e => setNotes(p => ({ ...p, [day]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
