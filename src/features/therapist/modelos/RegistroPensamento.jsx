import { useState } from "react";
import styles from "./Modelo.module.css";

const INITIAL = { situacao: "", emocao: "", intensidade: 50, pensamento: "", distorcao: "", alternativo: "", reintensidade: 30 };

const DISTORCOES = [
  "Catastrofização", "Pensamento tudo-ou-nada", "Leitura mental",
  "Adivinhação do futuro", "Filtragem negativa", "Desconto do positivo",
  "Generalização excessiva", "Personalização", "Imperativo do dever",
];

export default function RegistroPensamento({ patientName = "Paciente" }) {
  const [records, setRecords] = useState([{ id: Date.now(), ...INITIAL }]);
  const [activeId, setActiveId] = useState(records[0].id);
  const [downloading, setDownloading] = useState(false);

  const active = records.find(r => r.id === activeId);

  const updateActive = (field, val) =>
    setRecords(prev => prev.map(r => r.id === activeId ? { ...r, [field]: val } : r));

  const addRecord = () => {
    const newR = { id: Date.now(), ...INITIAL };
    setRecords(prev => [...prev, newR]);
    setActiveId(newR.id);
  };

  const removeRecord = (id) => {
    const next = records.filter(r => r.id !== id);
    setRecords(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
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
      pdf.text("Registro de Pensamento Automático", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      records.forEach((r, idx) => {
        if (idx > 0) y += 6;
        pdf.setFillColor(240, 248, 244); pdf.roundedRect(14, y, pageW - 28, 6, 2, 2, "F");
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(90, 140, 110);
        pdf.text(`Registro ${idx + 1}`, 18, y + 4.5); y += 10;

        const fields = [
          ["Situação", r.situacao],
          ["Emoção", `${r.emocao} (Intensidade: ${r.intensidade}%)`],
          ["Pensamento automático", r.pensamento],
          ["Distorção cognitiva", r.distorcao],
          ["Pensamento alternativo", `${r.alternativo} (Nova intensidade: ${r.reintensidade}%)`],
        ];
        fields.forEach(([label, val]) => {
          pdf.setFontSize(8.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
          pdf.text(`${label}:`, 14, y);
          pdf.setFont("helvetica", "normal"); pdf.setTextColor(80, 80, 80);
          const lines = pdf.splitTextToSize(val || "—", pageW - 42);
          pdf.text(lines, 50, y);
          y += Math.max(lines.length * 5, 6);
        });
      });

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`registro_pensamento_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🧠 Registro de Pensamento Automático</h2>
          <p className={styles.subtitle}>Reestruturação cognitiva baseada em TCC</p>
        </div>
        <div className={styles.actions}>
          <button onClick={addRecord} className={styles.btnReset}>+ Novo Registro</button>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
            {downloading ? "Gerando..." : "⬇ Baixar PDF"}
          </button>
        </div>
      </div>

      <div className={styles.recordTabs}>
        {records.map((r, i) => (
          <div key={r.id} className={`${styles.recordTab} ${r.id === activeId ? styles.recordTabActive : ""}`}>
            <button className={styles.recordTabBtn} onClick={() => setActiveId(r.id)}>
              Registro {i + 1}
            </button>
            {records.length > 1 && (
              <button className={styles.recordTabClose} onClick={() => removeRecord(r.id)}>×</button>
            )}
          </div>
        ))}
      </div>

      {active && (
        <div className={styles.rpaGrid}>
          <div className={`${styles.rpaCard} ${styles.rpaLeft}`}>
            <h3 className={styles.rpaCardTitle}>📥 Situação Ativadora</h3>
            <label className={styles.fieldLabel}>O que aconteceu?</label>
            <textarea className={styles.fieldTextarea} rows={3} placeholder="Descreva a situação..." value={active.situacao} onChange={e => updateActive("situacao", e.target.value)} />

            <label className={styles.fieldLabel}>Emoção sentida</label>
            <input className={styles.fieldInput} placeholder="Ex: Tristeza, Raiva, Medo..." value={active.emocao} onChange={e => updateActive("emocao", e.target.value)} />

            <label className={styles.fieldLabel}>Intensidade da emoção: <strong>{active.intensidade}%</strong></label>
            <input type="range" min={0} max={100} value={active.intensidade} onChange={e => updateActive("intensidade", Number(e.target.value))} className={styles.fieldRange} style={{ accentColor: "#e07b7b" }} />
          </div>

          <div className={`${styles.rpaCard} ${styles.rpaCenter}`}>
            <h3 className={styles.rpaCardTitle}>💡 Pensamento Automático</h3>
            <label className={styles.fieldLabel}>O que passou pela sua mente?</label>
            <textarea className={styles.fieldTextarea} rows={3} placeholder="Pensamento automático..." value={active.pensamento} onChange={e => updateActive("pensamento", e.target.value)} />

            <label className={styles.fieldLabel}>Distorção cognitiva identificada</label>
            <select className={styles.fieldSelect} value={active.distorcao} onChange={e => updateActive("distorcao", e.target.value)}>
              <option value="">Selecionar...</option>
              {DISTORCOES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className={`${styles.rpaCard} ${styles.rpaRight}`}>
            <h3 className={styles.rpaCardTitle}>✅ Pensamento Alternativo</h3>
            <label className={styles.fieldLabel}>Como pensar de forma mais equilibrada?</label>
            <textarea className={styles.fieldTextarea} rows={3} placeholder="Pensamento alternativo..." value={active.alternativo} onChange={e => updateActive("alternativo", e.target.value)} />

            <label className={styles.fieldLabel}>Nova intensidade da emoção: <strong>{active.reintensidade}%</strong></label>
            <input type="range" min={0} max={100} value={active.reintensidade} onChange={e => updateActive("reintensidade", Number(e.target.value))} className={styles.fieldRange} style={{ accentColor: "#4cbb6e" }} />

            {active.intensidade > 0 && active.reintensidade < active.intensidade && (
              <div className={styles.rpaImprovement}>
                ▼ {active.intensidade - active.reintensidade}% de redução na intensidade
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
