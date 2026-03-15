import { useState } from "react";
import styles from "./Modelo.module.css";

const EMOTION_GROUPS = [
  {
    group: "Alegria", color: "#f7c948", bg: "#fffbe6",
    emotions: ["Feliz", "Animado(a)", "Grato(a)", "Satisfeito(a)", "Empolgado(a)", "Esperançoso(a)"]
  },
  {
    group: "Tristeza", color: "#7b9fd4", bg: "#eaf0fb",
    emotions: ["Triste", "Melancólico(a)", "Decepcionado(a)", "Desmotivado(a)", "Solitário(a)", "Sem esperança"]
  },
  {
    group: "Raiva", color: "#e07b7b", bg: "#fdeaea",
    emotions: ["Com raiva", "Frustrado(a)", "Irritado(a)", "Indignado(a)", "Ressentido(a)", "Impaciente"]
  },
  {
    group: "Medo", color: "#9b7be0", bg: "#f3f0fd",
    emotions: ["Ansioso(a)", "Preocupado(a)", "Inseguro(a)", "Com medo", "Tenso(a)", "Apavorado(a)"]
  },
  {
    group: "Nojo/Vergonha", color: "#e0a96a", bg: "#fdf6e3",
    emotions: ["Envergonhado(a)", "Culpado(a)", "Inferior", "Ridicularizado(a)", "Humilhado(a)", "Inadequado(a)"]
  },
  {
    group: "Calma", color: "#6a997c", bg: "#eaf4ee",
    emotions: ["Tranquilo(a)", "Em paz", "Sereno(a)", "Centrado(a)", "Relaxado(a)", "Confortável"]
  },
];

export default function InventarioEmocoes({ patientName = "Paciente" }) {
  const [selected, setSelected] = useState({});
  const [intensities, setIntensities] = useState({});
  const [notes, setNotes] = useState("");
  const [downloading, setDownloading] = useState(false);

  const toggle = (emotion, color) => {
    setSelected(p => {
      const n = { ...p };
      if (n[emotion]) { delete n[emotion]; } else { n[emotion] = color; }
      return n;
    });
    if (!intensities[emotion]) setIntensities(p => ({ ...p, [emotion]: 5 }));
  };

  const selectedList = Object.keys(selected);

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
      pdf.text("Inventário de Emoções", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
      pdf.text(`Emoções identificadas: ${selectedList.length}`, 14, y); y += 8;

      if (selectedList.length === 0) {
        pdf.setFontSize(10); pdf.setFont("helvetica", "italic"); pdf.setTextColor(150, 150, 150);
        pdf.text("Nenhuma emoção selecionada.", 14, y);
      } else {
        EMOTION_GROUPS.forEach(g => {
          const groupSelected = g.emotions.filter(e => selected[e]);
          if (!groupSelected.length) return;
          pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
          pdf.text(g.group, 14, y); y += 6;
          groupSelected.forEach(e => {
            const intensity = intensities[e] || 5;
            pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
            pdf.text(`• ${e} — Intensidade: ${intensity}/10`, 20, y); y += 6;
          });
          y += 2;
        });
      }

      if (notes) {
        y += 4;
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text("Observações:", 14, y); y += 6;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
        const lines = pdf.splitTextToSize(notes, pageW - 28);
        pdf.text(lines, 14, y);
      }

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`inventario_emocoes_${patientName.replace(/\s+/g,"_")}_${today.replace(/\//g,"-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🎭 Inventário de Emoções</h2>
          <p className={styles.subtitle}>Selecione as emoções presentes e avalie a intensidade</p>
        </div>
        <div className={styles.actions}>
          <button onClick={() => { setSelected({}); setIntensities({}); setNotes(""); }} className={styles.btnReset}>Limpar</button>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>{downloading ? "Gerando..." : "⬇ Baixar PDF"}</button>
        </div>
      </div>

      {selectedList.length > 0 && (
        <div className={styles.emotionSummary}>
          <p className={styles.emotionSummaryTitle}>{selectedList.length} emoções selecionadas:</p>
          <div className={styles.emotionChips}>
            {selectedList.map(e => (
              <span key={e} className={styles.emotionChip} style={{ background: selected[e] + "22", color: selected[e], borderColor: selected[e] }}>
                {e} <span className={styles.chipIntensity}>{intensities[e]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.emotionGroups}>
        {EMOTION_GROUPS.map(g => (
          <div key={g.group} className={styles.emotionGroup} style={{ borderColor: g.color }}>
            <h3 className={styles.emotionGroupTitle} style={{ color: g.color, background: g.bg }}>{g.group}</h3>
            <div className={styles.emotionBtns}>
              {g.emotions.map(e => (
                <button
                  key={e}
                  className={`${styles.emotionBtn} ${selected[e] ? styles.emotionBtnActive : ""}`}
                  style={selected[e] ? { background: g.color, borderColor: g.color, color: "#fff" } : { borderColor: g.color + "66" }}
                  onClick={() => toggle(e, g.color)}
                >
                  {e}
                </button>
              ))}
            </div>
            {g.emotions.filter(e => selected[e]).map(e => (
              <div key={e} className={styles.emotionIntensityRow}>
                <span className={styles.emotionIntensityLabel} style={{ color: g.color }}>{e}</span>
                <input
                  type="range" min={1} max={10} value={intensities[e] || 5}
                  onChange={ev => setIntensities(p => ({ ...p, [e]: Number(ev.target.value) }))}
                  className={styles.fieldRange}
                  style={{ accentColor: g.color }}
                />
                <span style={{ color: g.color, fontWeight: 700, fontSize: "0.85rem", minWidth: 24 }}>{intensities[e] || 5}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <textarea className={styles.notesArea} placeholder="Observações clínicas..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ marginTop: 20 }} />
    </div>
  );
}
