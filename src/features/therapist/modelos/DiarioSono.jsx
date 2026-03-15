import { useState } from "react";
import styles from "./Modelo.module.css";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const QUALITY = [
  { value: 1, label: "Péssimo", emoji: "😞", color: "#e07b7b" },
  { value: 2, label: "Ruim", emoji: "🙁", color: "#e0a96a" },
  { value: 3, label: "Regular", emoji: "😐", color: "#e0d06a" },
  { value: 4, label: "Bom", emoji: "🙂", color: "#7bd47e" },
  { value: 5, label: "Ótimo", emoji: "😄", color: "#4cbb6e" },
];

const INITIAL_DAY = { bed: "22:00", wake: "07:00", quality: null, dreams: false, meds: false, notes: "" };

function calcHours(bed, wake) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return (mins / 60).toFixed(1);
}

export default function DiarioSono({ patientName = "Paciente" }) {
  const [entries, setEntries] = useState(
    Object.fromEntries(DAYS.map(d => [d, { ...INITIAL_DAY }]))
  );
  const [downloading, setDownloading] = useState(false);

  const update = (day, field, val) =>
    setEntries(p => ({ ...p, [day]: { ...p[day], [field]: val } }));

  const avgQuality = () => {
    const vals = DAYS.map(d => entries[d].quality).filter(Boolean);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };
  const avgSleep = () => {
    const vals = DAYS.map(d => parseFloat(calcHours(entries[d].bed, entries[d].wake)));
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
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
      pdf.text("Diário do Sono", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      DAYS.forEach(day => {
        const e = entries[day];
        const h = calcHours(e.bed, e.wake);
        const q = QUALITY.find(q => q.value === e.quality);
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text(day, 14, y);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(80, 80, 80);
        pdf.text(`Dormiu: ${e.bed}  Acordou: ${e.wake}  (${h}h)  Qualidade: ${q ? q.label : "—"}${e.meds ? "  [medicação]" : ""}${e.dreams ? "  [sonhos]" : ""}`, 28, y);
        if (e.notes) { y += 5; pdf.setFontSize(8); pdf.setTextColor(110, 110, 110); pdf.text(`  Nota: ${e.notes}`, 28, y); }
        y += 8;
      });

      y += 4;
      pdf.setFillColor(240, 248, 244); pdf.roundedRect(14, y, pageW - 28, 18, 4, 4, "F");
      pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
      pdf.text(`Média de sono: ${avgSleep()}h/noite  ·  Qualidade média: ${avgQuality() || "—"}/5`, 18, y + 11);

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`diario_sono_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  const aq = avgQuality();
  const qColor = aq ? QUALITY[Math.round(aq) - 1]?.color : "#999";

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🌙 Diário do Sono</h2>
          <p className={styles.subtitle}>Monitoramento semanal do padrão de sono</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
            {downloading ? "Gerando..." : "⬇ Baixar PDF"}
          </button>
        </div>
      </div>

      <div className={styles.sonoStats}>
        <div className={styles.sonoStat}>
          <span className={styles.sonoStatVal}>{avgSleep()}h</span>
          <span className={styles.sonoStatLabel}>Média por noite</span>
        </div>
        <div className={styles.sonoStat}>
          <span className={styles.sonoStatVal} style={{ color: qColor }}>{aq ? `${aq}/5` : "—"}</span>
          <span className={styles.sonoStatLabel}>Qualidade média</span>
        </div>
        <div className={styles.sonoStat}>
          <span className={styles.sonoStatVal}>{DAYS.filter(d => entries[d].meds).length}</span>
          <span className={styles.sonoStatLabel}>Dias com medicação</span>
        </div>
      </div>

      <div className={styles.sonoTable}>
        <div className={styles.sonoHeader}>
          <span>Dia</span><span>Dormiu</span><span>Acordou</span><span>Horas</span><span>Qualidade</span><span>Meds</span><span>Sonhos</span><span>Nota</span>
        </div>
        {DAYS.map(day => {
          const e = entries[day];
          const h = calcHours(e.bed, e.wake);
          const hNum = parseFloat(h);
          const hColor = hNum >= 7 ? "#4cbb6e" : hNum >= 5 ? "#e0d06a" : "#e07b7b";
          return (
            <div key={day} className={styles.sonoRow}>
              <span className={styles.sonoDayName}>{day}</span>
              <input type="time" className={styles.timeInput} value={e.bed} onChange={ev => update(day, "bed", ev.target.value)} />
              <input type="time" className={styles.timeInput} value={e.wake} onChange={ev => update(day, "wake", ev.target.value)} />
              <span className={styles.sonoHours} style={{ color: hColor }}>{h}h</span>
              <div className={styles.sonoQualityBtns}>
                {QUALITY.map(q => (
                  <button
                    key={q.value}
                    className={`${styles.sonoQBtn} ${e.quality === q.value ? styles.sonoQActive : ""}`}
                    style={e.quality === q.value ? { background: q.color, borderColor: q.color } : {}}
                    onClick={() => update(day, "quality", q.value)}
                    title={q.label}
                  >
                    {q.emoji}
                  </button>
                ))}
              </div>
              <button className={`${styles.sonoToggle} ${e.meds ? styles.sonoToggleOn : ""}`} onClick={() => update(day, "meds", !e.meds)}>💊</button>
              <button className={`${styles.sonoToggle} ${e.dreams ? styles.sonoToggleOn : ""}`} onClick={() => update(day, "dreams", !e.dreams)}>💭</button>
              <input className={styles.sonoNote} placeholder="..." value={e.notes} onChange={ev => update(day, "notes", ev.target.value)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
