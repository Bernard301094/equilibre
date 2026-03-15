import { useState } from "react";
import styles from "./Modelo.module.css";

const CATEGORIES = [
  { key: "trabalho", label: "Trabalho / Estudos", color: "#7b9fd4", emoji: "💼" },
  { key: "relacionamentos", label: "Relacionamentos", color: "#e07bb8", emoji: "❤️" },
  { key: "saude", label: "Saúde", color: "#4cbb6e", emoji: "🌿" },
  { key: "financas", label: "Finanças", color: "#e0b96a", emoji: "💰" },
  { key: "familia", label: "Família", color: "#9b7be0", emoji: "🏠" },
  { key: "outro", label: "Outro", color: "#5bb8b8", emoji: "❓" },
];

const COPING_STRATEGIES = [
  "Respiração profunda", "Exercício físico", "Conversar com alguém",
  "Escrever / Journaling", "Ouvir música", "Meditar",
  "Descansar / Dormir", "Atividade criativa", "Buscar ajuda profissional",
];

export default function InventarioEstresse({ patientName = "Paciente" }) {
  const [stressors, setStressors] = useState([{ id: Date.now(), category: "trabalho", description: "", impact: 5, duration: "" }]);
  const [coping, setCoping] = useState([]);
  const [generalLevel, setGeneralLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [downloading, setDownloading] = useState(false);

  const addStressor = () => setStressors(p => [...p, { id: Date.now(), category: "trabalho", description: "", impact: 5, duration: "" }]);
  const removeStressor = (id) => setStressors(p => p.filter(s => s.id !== id));
  const updateStressor = (id, field, val) => setStressors(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));
  const toggleCoping = (s) => setCoping(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const levelColor = generalLevel <= 3 ? "#4cbb6e" : generalLevel <= 6 ? "#e0b96a" : "#e07b7b";
  const levelLabel = generalLevel <= 3 ? "Baixo" : generalLevel <= 6 ? "Moderado" : "Alto";

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
      pdf.text("Inventário de Estresse", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
      pdf.text(`Nível geral de estresse: ${generalLevel}/10 — ${levelLabel}`, 14, y); y += 10;

      pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
      pdf.text("Situações estressoras:", 14, y); y += 8;
      stressors.forEach((s, i) => {
        const cat = CATEGORIES.find(c => c.key === s.category);
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(60, 60, 60);
        pdf.text(`${i + 1}. [${cat?.label}] Impacto: ${s.impact}/10${s.duration ? " · Duração: " + s.duration : ""}`, 14, y); y += 5;
        if (s.description) {
          pdf.setFont("helvetica", "normal"); pdf.setTextColor(90, 90, 90);
          const lines = pdf.splitTextToSize(s.description, pageW - 32);
          pdf.text(lines, 18, y); y += lines.length * 5;
        }
        y += 3;
      });

      if (coping.length) {
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text("Estratégias de enfrentamento:", 14, y); y += 6;
        coping.forEach(c => { pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80); pdf.text(`• ${c}`, 18, y); y += 5; });
      }

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`inventario_estresse_${patientName.replace(/\s+/g,"_")}_${today.replace(/\//g,"-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>⚡ Inventário de Estresse</h2>
          <p className={styles.subtitle}>Mapeie as situações estressoras e estratégias de enfrentamento</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>{downloading ? "Gerando..." : "⬇ Baixar PDF"}</button>
        </div>
      </div>

      <div className={styles.stressLevelCard} style={{ borderColor: levelColor, background: levelColor + "11" }}>
        <div className={styles.stressLevelLabel} style={{ color: levelColor }}>Nível geral de estresse</div>
        <input type="range" min={1} max={10} value={generalLevel} onChange={e => setGeneralLevel(Number(e.target.value))} className={styles.fieldRange} style={{ accentColor: levelColor }} />
        <div className={styles.stressLevelValue} style={{ color: levelColor }}>{generalLevel}/10 — <strong>{levelLabel}</strong></div>
      </div>

      <div className={styles.stressors}>
        <div className={styles.stressorsHeader}>
          <h3 className={styles.stressorsTitle}>Situações Estressoras</h3>
          <button className={styles.btnAddItem} onClick={addStressor}>+ Adicionar</button>
        </div>
        {stressors.map((s) => {
          const cat = CATEGORIES.find(c => c.key === s.category);
          return (
            <div key={s.id} className={styles.stressorCard} style={{ borderColor: cat?.color }}>
              <div className={styles.stressorHeader}>
                <select
                  className={styles.fieldSelect}
                  value={s.category}
                  onChange={e => updateStressor(s.id, "category", e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                </select>
                <input className={styles.fieldInput} placeholder="Duração (ex: 2 semanas)" value={s.duration} onChange={e => updateStressor(s.id, "duration", e.target.value)} style={{ maxWidth: 160 }} />
                {stressors.length > 1 && <button className={styles.removeBtn} onClick={() => removeStressor(s.id)}>×</button>}
              </div>
              <textarea className={styles.fieldTextarea} rows={2} placeholder="Descreva a situação estressora..." value={s.description} onChange={e => updateStressor(s.id, "description", e.target.value)} />
              <div className={styles.stressorImpact}>
                <label className={styles.fieldLabel}>Impacto: <strong style={{ color: cat?.color }}>{s.impact}/10</strong></label>
                <input type="range" min={1} max={10} value={s.impact} onChange={e => updateStressor(s.id, "impact", Number(e.target.value))} className={styles.fieldRange} style={{ accentColor: cat?.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.copingSection}>
        <h3 className={styles.stressorsTitle}>Estratégias de Enfrentamento</h3>
        <div className={styles.triggerTags}>
          {COPING_STRATEGIES.map(s => (
            <button key={s} className={`${styles.triggerTag} ${coping.includes(s) ? styles.triggerActive : ""}`} onClick={() => toggleCoping(s)}>{s}</button>
          ))}
        </div>
      </div>

      <textarea className={styles.notesArea} placeholder="Observações clínicas..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ marginTop: 20 }} />
    </div>
  );
}
