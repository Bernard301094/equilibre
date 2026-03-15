import { useState } from "react";
import styles from "./Modelo.module.css";

const INITIAL_CONTACTS = [
  { name: "", phone: "", relation: "" },
  { name: "", phone: "", relation: "" },
  { name: "", phone: "", relation: "" },
];

export default function PlanoSeguranca({ patientName = "Paciente" }) {
  const [sinais, setSinais] = useState(["", "", ""]);
  const [estrategias, setEstrategias] = useState(["", "", "", ""]);
  const [ambientes, setAmbientes] = useState(["", ""]);
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [profContact, setProfContact] = useState({ name: "", phone: "", org: "" });
  const [commitment, setCommitment] = useState("");
  const [downloading, setDownloading] = useState(false);

  const updateList = (setter, idx, val) =>
    setter(prev => prev.map((item, i) => i === idx ? val : item));

  const updateContact = (idx, field, val) =>
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const today = new Date().toLocaleDateString("pt-BR");

      pdf.setFillColor(224, 123, 123); pdf.rect(0, 0, pageW, 32, "F");
      pdf.setFillColor(200, 100, 100); pdf.rect(0, 16, pageW, 16, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20); pdf.setFont("helvetica", "bold");
      pdf.text("Plano de Segurança", pageW / 2, 13, { align: "center" });
      pdf.setFontSize(10); pdf.setFont("helvetica", "normal");
      pdf.text(`Paciente: ${patientName}  ·  Data: ${today}`, pageW / 2, 24, { align: "center" });

      let y = 42;
      const section = (title) => {
        pdf.setFillColor(255, 240, 240); pdf.roundedRect(14, y, pageW - 28, 7, 2, 2, "F");
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(200, 80, 80);
        pdf.text(title, 18, y + 5); y += 11;
      };
      const item = (text) => {
        if (!text.trim()) return;
        pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(`• ${text}`, pageW - 32);
        pdf.text(lines, 18, y); y += lines.length * 5 + 2;
      };

      section("⚠️ Sinais de alerta");
      sinais.forEach(item);
      y += 2; section("🛡️ Estratégias internas");
      estrategias.forEach(item);
      y += 2; section("🏞️ Ambientes seguros");
      ambientes.forEach(item);
      y += 2; section("👥 Contatos de apoio");
      contacts.forEach(c => { if (c.name) item(`${c.name} (${c.relation}) — ${c.phone}`); });
      y += 2; section("🏥 Profissional de referência");
      if (profContact.name) item(`${profContact.name} — ${profContact.org} — ${profContact.phone}`);
      if (commitment) { y += 2; section("✏️ Compromisso"); item(commitment); }

      pdf.setFillColor(245, 245, 245); pdf.rect(0, 278, pageW, 20, "F");
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(150, 150, 150);
      pdf.text("Gerado por Equilibre · Plataforma de Acompanhamento Psicológico", pageW / 2, 286, { align: "center" });
      pdf.save(`plano_seguranca_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>🚨 Plano de Segurança</h2>
          <p className={styles.subtitle}>Protocolo de crise — para uso imediato em situações de risco</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPdf}>
            {downloading ? "Gerando..." : "⬇ Baixar PDF"}
          </button>
        </div>
      </div>

      <div className={styles.safetyGrid}>
        <div className={styles.safetySection} style={{ borderColor: "#e07b7b" }}>
          <h3 className={styles.safetySectionTitle} style={{ color: "#e07b7b" }}>⚠️ Sinais de Alerta</h3>
          <p className={styles.safetySectionDesc}>Pensamentos, sentimentos ou comportamentos que indicam perigo</p>
          {sinais.map((s, i) => (
            <input key={i} className={styles.fieldInput} placeholder={`Sinal ${i + 1}...`} value={s} onChange={e => updateList(setSinais, i, e.target.value)} />
          ))}
          <button className={styles.btnAddItem} onClick={() => setSinais(p => [...p, ""])}>+ Adicionar</button>
        </div>

        <div className={styles.safetySection} style={{ borderColor: "#7b9fd4" }}>
          <h3 className={styles.safetySectionTitle} style={{ color: "#7b9fd4" }}>🛡️ Estratégias Internas</h3>
          <p className={styles.safetySectionDesc}>O que posso fazer sozinho(a) para me acalmar</p>
          {estrategias.map((e, i) => (
            <input key={i} className={styles.fieldInput} placeholder={`Estratégia ${i + 1}...`} value={e} onChange={ev => updateList(setEstrategias, i, ev.target.value)} />
          ))}
          <button className={styles.btnAddItem} onClick={() => setEstrategias(p => [...p, ""])}>+ Adicionar</button>
        </div>

        <div className={styles.safetySection} style={{ borderColor: "#6a997c" }}>
          <h3 className={styles.safetySectionTitle} style={{ color: "#6a997c" }}>🏞️ Ambientes Seguros</h3>
          <p className={styles.safetySectionDesc}>Lugares onde me sinto seguro(a)</p>
          {ambientes.map((a, i) => (
            <input key={i} className={styles.fieldInput} placeholder={`Ambiente ${i + 1}...`} value={a} onChange={e => updateList(setAmbientes, i, e.target.value)} />
          ))}
          <button className={styles.btnAddItem} onClick={() => setAmbientes(p => [...p, ""])}>+ Adicionar</button>
        </div>

        <div className={styles.safetySection} style={{ borderColor: "#9b7be0" }}>
          <h3 className={styles.safetySectionTitle} style={{ color: "#9b7be0" }}>👥 Contatos de Apoio</h3>
          <p className={styles.safetySectionDesc}>Pessoas de confiança que posso contatar</p>
          {contacts.map((c, i) => (
            <div key={i} className={styles.contactRow}>
              <input className={styles.fieldInput} placeholder="Nome" value={c.name} onChange={e => updateContact(i, "name", e.target.value)} />
              <input className={styles.fieldInput} placeholder="Relação" value={c.relation} onChange={e => updateContact(i, "relation", e.target.value)} />
              <input className={styles.fieldInput} placeholder="Telefone" value={c.phone} onChange={e => updateContact(i, "phone", e.target.value)} />
            </div>
          ))}
          <button className={styles.btnAddItem} onClick={() => setContacts(p => [...p, { name: "", phone: "", relation: "" }])}>+ Adicionar</button>
        </div>

        <div className={styles.safetySection} style={{ borderColor: "#5bb8b8" }}>
          <h3 className={styles.safetySectionTitle} style={{ color: "#5bb8b8" }}>🏥 Profissional de Referência</h3>
          <input className={styles.fieldInput} placeholder="Nome do profissional" value={profContact.name} onChange={e => setProfContact(p => ({ ...p, name: e.target.value }))} />
          <input className={styles.fieldInput} placeholder="Organização / Clínica" value={profContact.org} onChange={e => setProfContact(p => ({ ...p, org: e.target.value }))} />
          <input className={styles.fieldInput} placeholder="Telefone / WhatsApp" value={profContact.phone} onChange={e => setProfContact(p => ({ ...p, phone: e.target.value }))} />
        </div>

        <div className={styles.safetySection} style={{ borderColor: "#e0b96a" }}>
          <h3 className={styles.safetySectionTitle} style={{ color: "#e0b96a" }}>✏️ Compromisso</h3>
          <p className={styles.safetySectionDesc}>Declaração pessoal de comprometimento com a própria segurança</p>
          <textarea className={styles.fieldTextarea} rows={3} placeholder="Eu me comprometo a..." value={commitment} onChange={e => setCommitment(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
