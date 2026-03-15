import { useState } from "react";
import styles from "./Modelo.module.css";

const QUESTIONS = [
  "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)",
  "Não conseguir parar ou controlar as preocupações",
  "Preocupar-se demais com diferentes coisas",
  "Dificuldade para relaxar",
  "Ficar tão agitado(a) que se torna difícil ficar parado(a)",
  "Ficar facilmente irritado(a) ou impaciente",
  "Sentir medo como se algo terrível fosse acontecer",
];

const OPTIONS = [
  { label: "Nenhuma vez", value: 0 },
  { label: "Vários dias", value: 1 },
  { label: "Mais da metade dos dias", value: 2 },
  { label: "Quase todo dia", value: 3 },
];

const SEVERITY = [
  { min: 0, max: 4, label: "Mínimo", color: "#6a997c", bg: "#eaf4ee" },
  { min: 5, max: 9, label: "Leve", color: "#7b9fd4", bg: "#eaf0fb" },
  { min: 10, max: 14, label: "Moderado", color: "#e0b96a", bg: "#fdf6e3" },
  { min: 15, max: 21, label: "Grave", color: "#e07b7b", bg: "#fdeaea" },
];

function getSeverity(score) {
  return SEVERITY.find((s) => score >= s.min && score <= s.max) || SEVERITY[0];
}

export default function GAD7({ patientName = "Paciente" }) {
  const [answers, setAnswers] = useState(Array(7).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const total = answers.reduce((s, v) => s + (v ?? 0), 0);
  const allAnswered = answers.every((v) => v !== null);
  const severity = getSeverity(total);

  const handleReset = () => { setAnswers(Array(7).fill(null)); setSubmitted(false); };

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
      pdf.text("Escala GAD-7", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
      pdf.text("Respostas", 14, y); y += 8;
      pdf.setDrawColor(220, 220, 220); pdf.line(14, y, pageW - 14, y); y += 6;

      QUESTIONS.forEach((q, i) => {
        const ans = answers[i];
        const opt = OPTIONS.find(o => o.value === ans);
        pdf.setFontSize(9); pdf.setFont("helvetica", "bold"); pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(`${i + 1}. ${q}`, pageW - 28);
        pdf.text(lines, 14, y); y += lines.length * 5;
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(100, 100, 100);
        pdf.text(`Resposta: ${opt ? opt.label + " (" + ans + ")" : "—"}`, 18, y); y += 8;
      });

      y += 4;
      pdf.setFillColor(240, 248, 244); pdf.roundedRect(14, y, pageW - 28, 26, 4, 4, "F");
      pdf.setFontSize(13); pdf.setFont("helvetica", "bold"); pdf.setTextColor(40, 40, 40);
      pdf.text(`Pontuação Total: ${total} / 21`, 14 + 8, y + 9);
      pdf.setFontSize(11); pdf.setFont("helvetica", "normal"); pdf.setTextColor(90, 140, 110);
      pdf.text(`Classificação: ${severity.label}`, 14 + 8, y + 18);

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`gad7_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>😰 Escala GAD-7</h2>
          <p className={styles.subtitle}>Avaliação de ansiedade generalizada — últimas 2 semanas</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleReset} className={styles.btnReset}>Resetar</button>
          {submitted && (
            <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
              {downloading ? "Gerando..." : "⬇ Baixar PDF"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.questionnaire}>
        <p className={styles.instruction}>
          Nas <strong>últimas 2 semanas</strong>, com que frequência você foi incomodado(a) pelos seguintes problemas?
        </p>

        <div className={styles.optionHeader}>
          <span className={styles.qNum}>#</span>
          <span className={styles.qText}>Pergunta</span>
          {OPTIONS.map(o => (
            <span key={o.value} className={styles.optHead}>{o.label}</span>
          ))}
        </div>

        {QUESTIONS.map((q, i) => (
          <div key={i} className={`${styles.questionRow} ${answers[i] !== null ? styles.answered : ""}`}>
            <span className={styles.qNum}>{i + 1}</span>
            <span className={styles.qText}>{q}</span>
            {OPTIONS.map(o => (
              <button
                key={o.value}
                className={`${styles.optBtn} ${answers[i] === o.value ? styles.optSelected : ""}`}
                onClick={() => setAnswers(prev => { const a = [...prev]; a[i] = o.value; return a; })}
              >
                <span className={styles.optRadio} />
                <span className={styles.optVal}>{o.value}</span>
              </button>
            ))}
          </div>
        ))}

        {submitted && (
          <div className={styles.resultCard} style={{ borderColor: severity.color, background: severity.bg }}>
            <div className={styles.resultScore} style={{ color: severity.color }}>{total}</div>
            <div className={styles.resultInfo}>
              <span className={styles.resultLabel} style={{ color: severity.color }}>{severity.label}</span>
              <span className={styles.resultRange}>Pontuação de {total}/21 pontos</span>
            </div>
            <div className={styles.severityBar}>
              {SEVERITY.map(s => (
                <div
                  key={s.label}
                  className={styles.severitySegment}
                  style={{
                    background: s.color,
                    opacity: severity.label === s.label ? 1 : 0.25,
                    flex: s.max - s.min + 1,
                  }}
                  title={s.label}
                />
              ))}
            </div>
          </div>
        )}

        {!submitted && (
          <button
            className={styles.btnSubmit}
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
          >
            Ver Resultado
          </button>
        )}
      </div>
    </div>
  );
}
