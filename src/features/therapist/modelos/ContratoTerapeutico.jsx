import { useState } from "react";
import styles from "./Modelo.module.css";

const FREQUENCIES = ["Semanal", "Quinzenal", "Mensal", "Conforme necessidade"];
const DURATIONS = ["45 min", "50 min", "60 min", "75 min", "90 min"];

export default function ContratoTerapeutico({ patientName = "Paciente" }) {
  const [therapistName, setTherapistName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [frequency, setFrequency] = useState("Semanal");
  const [duration, setDuration] = useState("50 min");
  const [goals, setGoals] = useState(["", "", ""]);
  const [patientRules, setPatientRules] = useState(["", "", ""]);
  const [therapistRules, setTherapistRules] = useState(["", "", ""]);
  const [cancelPolicy, setCancelPolicy] = useState("");
  const [confidentiality, setConfidentiality] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const updateList = (setter, idx, val) =>
    setter(prev => prev.map((item, i) => i === idx ? val : item));

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
      pdf.text("Contrato Terapêutico", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      const section = (title) => {
        pdf.setFillColor(240, 248, 244); pdf.roundedRect(14, y, pageW - 28, 7, 2, 2, "F");
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(90, 140, 110);
        pdf.text(title, 18, y + 5); y += 11;
      };

      section("👤 Partes envolvidas");
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
      pdf.text(`Paciente: ${patientName}`, 18, y); y += 6;
      pdf.text(`Terapeuta: ${therapistName || "—"}`, 18, y); y += 10;

      section("📅 Configurações das Sessões");
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
      pdf.text(`Início: ${startDate || "—"}  ·  Frequência: ${frequency}  ·  Duração: ${duration}`, 18, y); y += 10;

      section("🎯 Objetivos Terapêuticos");
      goals.forEach((g, i) => { if (g) { pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60); pdf.text(`${i + 1}. ${g}`, 18, y); y += 6; } });
      y += 4;

      section("👤 Comprometimentos do Paciente");
      patientRules.forEach(r => { if (r) { pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60); pdf.text(`• ${r}`, 18, y); y += 6; } });
      y += 4;

      section("👩‍⚕️ Comprometimentos do Terapeuta");
      therapistRules.forEach(r => { if (r) { pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60); pdf.text(`• ${r}`, 18, y); y += 6; } });
      y += 4;

      if (cancelPolicy) { section("📆 Política de Cancelamento"); pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60); const lines = pdf.splitTextToSize(cancelPolicy, pageW - 32); pdf.text(lines, 18, y); y += lines.length * 5 + 4; }

      if (confidentiality) { section("🔒 Confidencialidade"); pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60); pdf.text("As informações compartilhadas nas sessões são sigilosas, conforme o Código de Ética Profissional.", 18, y); y += 10; }

      y += 8;
      pdf.setDrawColor(150); pdf.line(14, y, pageW / 2 - 4, y);
      pdf.line(pageW / 2 + 4, y, pageW - 14, y);
      pdf.setFontSize(8); pdf.setFont("helvetica", "normal"); pdf.setTextColor(130, 130, 130);
      pdf.text("Assinatura do Paciente", 14, y + 5);
      pdf.text("Assinatura do Terapeuta", pageW / 2 + 4, y + 5);

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`contrato_terapeutico_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>📄 Contrato Terapêutico</h2>
          <p className={styles.subtitle}>Metas, regras e comprometimentos mútuos da terapia</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
            {downloading ? "Gerando..." : "⬇ Baixar PDF"}
          </button>
        </div>
      </div>

      <div className={styles.contratoGrid}>
        <div className={styles.contratoSection}>
          <h3 className={styles.contratoTitle}>👤 Partes</h3>
          <label className={styles.fieldLabel}>Nome do Terapeuta</label>
          <input className={styles.fieldInput} placeholder="Dr(a)..." value={therapistName} onChange={e => setTherapistName(e.target.value)} />
          <label className={styles.fieldLabel}>Paciente</label>
          <input className={styles.fieldInput} value={patientName} disabled />
        </div>

        <div className={styles.contratoSection}>
          <h3 className={styles.contratoTitle}>📅 Sessões</h3>
          <label className={styles.fieldLabel}>Data de início</label>
          <input type="date" className={styles.fieldInput} value={startDate} onChange={e => setStartDate(e.target.value)} />
          <label className={styles.fieldLabel}>Frequência</label>
          <div className={styles.toggleGroup}>
            {FREQUENCIES.map(f => (
              <button key={f} className={`${styles.toggleBtn} ${frequency === f ? styles.toggleActive : ""}`} onClick={() => setFrequency(f)}>{f}</button>
            ))}
          </div>
          <label className={styles.fieldLabel}>Duração</label>
          <div className={styles.toggleGroup}>
            {DURATIONS.map(d => (
              <button key={d} className={`${styles.toggleBtn} ${duration === d ? styles.toggleActive : ""}`} onClick={() => setDuration(d)}>{d}</button>
            ))}
          </div>
        </div>

        <div className={styles.contratoSection} style={{ gridColumn: "1 / -1" }}>
          <h3 className={styles.contratoTitle}>🎯 Objetivos Terapêuticos</h3>
          {goals.map((g, i) => (
            <input key={i} className={styles.fieldInput} placeholder={`Objetivo ${i + 1}...`} value={g} onChange={e => updateList(setGoals, i, e.target.value)} />
          ))}
          <button className={styles.btnAddItem} onClick={() => setGoals(p => [...p, ""])}>+ Adicionar objetivo</button>
        </div>

        <div className={styles.contratoSection}>
          <h3 className={styles.contratoTitle}>👤 Compromissos do Paciente</h3>
          {patientRules.map((r, i) => (
            <input key={i} className={styles.fieldInput} placeholder={`Compromisso ${i + 1}...`} value={r} onChange={e => updateList(setPatientRules, i, e.target.value)} />
          ))}
          <button className={styles.btnAddItem} onClick={() => setPatientRules(p => [...p, ""])}>+ Adicionar</button>
        </div>

        <div className={styles.contratoSection}>
          <h3 className={styles.contratoTitle}>👩‍⚕️ Compromissos do Terapeuta</h3>
          {therapistRules.map((r, i) => (
            <input key={i} className={styles.fieldInput} placeholder={`Compromisso ${i + 1}...`} value={r} onChange={e => updateList(setTherapistRules, i, e.target.value)} />
          ))}
          <button className={styles.btnAddItem} onClick={() => setTherapistRules(p => [...p, ""])}>+ Adicionar</button>
        </div>

        <div className={styles.contratoSection} style={{ gridColumn: "1 / -1" }}>
          <h3 className={styles.contratoTitle}>📆 Política de Cancelamento</h3>
          <textarea className={styles.fieldTextarea} rows={2} placeholder="Ex: Cancelamentos com menos de 24h serão cobrados..." value={cancelPolicy} onChange={e => setCancelPolicy(e.target.value)} />
        </div>

        <div className={styles.contratoSection} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={confidentiality} onChange={e => setConfidentiality(e.target.checked)} className={styles.checkbox} />
            <span>🔒 Incluir cláusula de confidencialidade no PDF</span>
          </label>
        </div>
      </div>
    </div>
  );
}
