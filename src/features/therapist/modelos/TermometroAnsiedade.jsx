import { useState } from "react";
import styles from "./Modelo.module.css";

const ZONES = [
  { min: 0, max: 20, label: "Calmo", color: "#4cbb6e", emoji: "😌" },
  { min: 21, max: 40, label: "Levemente ansioso", color: "#a8d660", emoji: "🙂" },
  { min: 41, max: 60, label: "Moderadamente ansioso", color: "#e0d06a", emoji: "😐" },
  { min: 61, max: 80, label: "Muito ansioso", color: "#e0a96a", emoji: "😟" },
  { min: 81, max: 100, label: "Ansiedade extrema", color: "#e07b7b", emoji: "😰" },
];

function getZone(val) {
  return ZONES.find(z => val >= z.min && val <= z.max) || ZONES[0];
}

const TRIGGERS = [
  "Trabalho / Estudos", "Relacionamentos", "Saúde", "Finanças",
  "Futuro", "Família", "Social", "Outro",
];

export default function TermometroAnsiedade({ patientName = "Paciente" }) {
  const [value, setValue] = useState(30);
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [phase, setPhase] = useState("before"); // before | session | after | done
  const [triggers, setTriggers] = useState([]);
  const [notes, setNotes] = useState("");
  const [downloading, setDownloading] = useState(false);

  const zone = getZone(value);
  const thermHeight = 200;
  const fillH = (value / 100) * thermHeight;

  const toggleTrigger = (t) =>
    setTriggers(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

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
      pdf.text("Termômetro de Ansiedade", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      if (before !== null) {
        const zb = getZone(before);
        pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text(`Antes da sessão: ${before}/100 — ${zb.label}`, 14, y); y += 10;
      }
      if (after !== null) {
        const za = getZone(after);
        pdf.setFontSize(11); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text(`Após a sessão: ${after}/100 — ${za.label}`, 14, y); y += 10;
        if (before !== null) {
          const diff = before - after;
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
          pdf.setTextColor(diff >= 0 ? 76 : 224, diff >= 0 ? 187 : 123, diff >= 0 ? 110 : 123);
          pdf.text(`Redução de ansiedade: ${diff > 0 ? "-" : "+"}${Math.abs(diff)} pontos`, 14, y); y += 10;
        }
      }
      if (triggers.length > 0) {
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(50, 50, 50);
        pdf.text(`Gatilhos identificados: ${triggers.join(", ")}`, 14, y); y += 10;
      }
      if (notes) {
        pdf.setFontSize(9); pdf.setFont("helvetica", "italic"); pdf.setTextColor(90, 90, 90);
        const noteLines = pdf.splitTextToSize(`Observações: ${notes}`, pageW - 28);
        pdf.text(noteLines, 14, y);
      }

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`termometro_ansiedade_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🌡️ Termômetro de Ansiedade</h2>
          <p className={styles.subtitle}>Meça o nível de ansiedade antes e após a sessão</p>
        </div>
        <div className={styles.actions}>
          <button onClick={() => { setValue(30); setBefore(null); setAfter(null); setPhase("before"); setTriggers([]); setNotes(""); }} className={styles.btnReset}>Resetar</button>
          {phase === "done" && (
            <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
              {downloading ? "Gerando..." : "⬇ Baixar PDF"}
            </button>
          )}
        </div>
      </div>

      <div className={styles.thermLayout}>
        <div className={styles.thermContainer}>
          <div className={styles.thermScale}>
            {[100, 80, 60, 40, 20, 0].map(v => (
              <span key={v} className={styles.thermTick}>{v}</span>
            ))}
          </div>
          <div className={styles.thermOuter}>
            <div
              className={styles.thermFill}
              style={{
                height: `${fillH}px`,
                background: `linear-gradient(to top, ${zone.color}, ${zone.color}cc)`,
              }}
            />
            <div className={styles.thermBulb} style={{ background: zone.color }} />
          </div>
          <div className={styles.thermZones}>
            {ZONES.slice().reverse().map(z => (
              <div key={z.label} className={styles.thermZoneLabel} style={{ color: z.color }}>
                {z.emoji} {z.label}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.thermControls}>
          <div className={styles.thermValueDisplay} style={{ color: zone.color }}>
            <span className={styles.thermBigVal}>{value}</span>
            <span className={styles.thermUnit}>/100</span>
          </div>
          <div className={styles.thermZoneBadge} style={{ background: zone.color + "22", color: zone.color }}>
            {zone.emoji} {zone.label}
          </div>

          <input
            type="range" min={0} max={100} step={1}
            value={value}
            onChange={e => setValue(Number(e.target.value))}
            className={styles.thermSlider}
            style={{ accentColor: zone.color }}
          />

          <div className={styles.thermPhases}>
            {phase === "before" && (
              <>
                <p className={styles.phaseLabel}>📍 Nível <strong>antes</strong> da sessão</p>
                <button className={styles.btnPhase} onClick={() => { setBefore(value); setPhase("session"); }}>
                  Registrar e iniciar sessão
                </button>
              </>
            )}
            {phase === "session" && (
              <>
                <div className={styles.phaseSaved}>✅ Antes: <strong>{before}/100</strong> — {getZone(before).label}</div>
                <p className={styles.phaseLabel}>📍 Nível <strong>após</strong> a sessão</p>
                <button className={styles.btnPhase} onClick={() => { setAfter(value); setPhase("done"); }}>
                  Registrar resultado final
                </button>
              </>
            )}
            {phase === "done" && (
              <div className={styles.compareBox}>
                <div className={styles.compareRow}>
                  <span>Antes</span>
                  <span style={{ color: getZone(before).color }}>{before}/100 — {getZone(before).label}</span>
                </div>
                <div className={styles.compareRow}>
                  <span>Depois</span>
                  <span style={{ color: getZone(after).color }}>{after}/100 — {getZone(after).label}</span>
                </div>
                {before - after !== 0 && (
                  <div className={styles.compareRow}>
                    <span>Variação</span>
                    <span style={{ color: before > after ? "#4cbb6e" : "#e07b7b", fontWeight: 700 }}>
                      {before > after ? "▼" : "▲"} {Math.abs(before - after)} pts
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.triggersSection}>
            <p className={styles.triggersTitle}>Gatilhos identificados</p>
            <div className={styles.triggerTags}>
              {TRIGGERS.map(t => (
                <button
                  key={t}
                  className={`${styles.triggerTag} ${triggers.includes(t) ? styles.triggerActive : ""}`}
                  onClick={() => toggleTrigger(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className={styles.notesArea}
            placeholder="Observações clínicas..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
