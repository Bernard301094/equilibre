import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { formatDate } from "../../utils/dates";
import { SkeletonResponses } from "../../components/ui/Skeleton";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";
import TherapistProgress from "./TherapistProgress";
import toast from "../../utils/toast";
import "./ResponsesView.css";

const VALIDATIONS = [
  { emoji: "👏", label: "Parabéns!"       },
  { emoji: "💪", label: "Continue assim!" },
  { emoji: "🌱", label: "Bom progresso!"  },
  { emoji: "🔄", label: "Reflita mais"    },
  { emoji: "❤️", label: "Aqui por você"   },
];

function exportClinicalPDF(response, patient, exercise, qaList) {
  const dataConclusao = formatDate(response.completed_at, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute:"2-digit" });
  let htmlContent = `
    <html>
      <head>
        <title>Relatório Clínico - ${patient?.name || 'Paciente'}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
          .doc-title { font-size: 20px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; font-size: 14px; }
          .meta-item strong { color: #475569; display: block; font-size: 12px; text-transform: uppercase; }
          .qa-block { page-break-inside: avoid; margin-bottom: 20px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
          .qa-question { background: #f1f5f9; padding: 12px 15px; font-weight: bold; color: #334155; border-bottom: 1px solid #cbd5e1; font-size: 14px; }
          .qa-answer { padding: 15px; font-size: 15px; white-space: pre-wrap; color: #0f172a; }
          .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .stamp { display: inline-block; background: #ecfdf5; color: #059669; padding: 5px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; border: 1px solid #a7f3d0; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Equilibre Platform</div>
          <div class="doc-title">Relatório de Atividade Terapêutica</div>
        </div>
        <div class="meta-box">
          <div class="meta-item"><strong>Paciente</strong>${patient?.name || 'Desconhecido'}</div>
          <div class="meta-item"><strong>Exercício / Protocolo</strong>${exercise?.title || 'Exercício'}</div>
          <div class="meta-item"><strong>Data de Resolução</strong>${dataConclusao}</div>
        </div>
        <div class="content">
  `;
  qaList.forEach(({ q, val }) => {
    let displayValue = val;
    if (typeof val === 'object') displayValue = JSON.stringify(val, null, 2).replace(/[\{\}\[\]"]/g, '');
    htmlContent += `<div class="qa-block"><div class="qa-question">${q.text}</div><div class="qa-answer">${displayValue || 'Nenhuma resposta inserida.'}</div></div>`;
  });
  if (response.therapist_note || response.therapist_stamp) {
    htmlContent += `<div style="margin-top:40px;padding:20px;border-left:4px solid #3b82f6;background:#eff6ff;"><strong style="color:#1e3a8a;display:block;margin-bottom:10px;">Anotação Clínica</strong>${response.therapist_note ? `<p style="margin:0;font-style:italic;">"${response.therapist_note}"</p>` : ''}${response.therapist_stamp ? `<span class="stamp">${response.therapist_stamp}</span>` : ''}</div>`;
  }
  htmlContent += `</div><div class="footer">Gerado confidencialmente pelo sistema Equilibre em ${new Date().toLocaleDateString()}.</div></body></html>`;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function FeedbackPanel({ response, session, onSaved }) {
  const [open,   setOpen]   = useState(false);
  const [text,   setText]   = useState(response.therapist_note  ?? "");
  const [stamp,  setStamp]  = useState(response.therapist_stamp ?? "");
  const [saving, setSaving] = useState(false);
  const inflightRef = useRef(false);
  const hasExisting = !!(response.therapist_note || response.therapist_stamp);

  const handleSave = async () => {
    if (inflightRef.current || saving) return;
    if (!text.trim() && !stamp) { toast.error("Escreva um comentário ou selecione um selo."); return; }
    inflightRef.current = true; setSaving(true);
    try {
      await db.update("responses", { id: response.id }, { therapist_note: text.trim() || null, therapist_stamp: stamp || null, noted_at: new Date().toISOString() }, session.access_token);
      toast.success("Feedback enviado!");
      onSaved({ therapist_note: text.trim() || null, therapist_stamp: stamp || null });
      setOpen(false);
    } catch (e) { toast.error("Erro ao salvar: " + e.message); } finally { setSaving(false); inflightRef.current = false; }
  };

  const handleClear = async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      await db.update("responses", { id: response.id }, { therapist_note: null, therapist_stamp: null, noted_at: null }, session.access_token);
      setText(""); setStamp(""); toast.success("Feedback removido.");
      onSaved({ therapist_note: null, therapist_stamp: null }); setOpen(false);
    } catch (e) { toast.error("Erro ao remover: " + e.message); } finally { inflightRef.current = false; }
  };

  return (
    <div className="fp">
      {hasExisting && !open && (
        <div className="fp__summary">
          {response.therapist_stamp && <span className="fp__summary-emoji">{VALIDATIONS.find(v => v.label === response.therapist_stamp)?.emoji ?? "💬"}</span>}
          <div className="fp__summary-body">
            {response.therapist_stamp && <span className="fp__summary-stamp">{response.therapist_stamp}</span>}
            {response.therapist_note && <span className="fp__summary-note">"{response.therapist_note}"</span>}
          </div>
          <button className="fp__edit-btn" onClick={() => setOpen(true)}>✏️ Editar</button>
        </div>
      )}
      {!open && <button className={`fp__toggle${hasExisting ? " fp__toggle--has" : ""}`} onClick={() => setOpen(true)}>{hasExisting ? "Ver feedback" : "💬 Deixar feedback"}</button>}
      {open && (
        <div className="fp__panel">
          <p className="fp__section-label">Selos rápidos</p>
          <div className="fp__stamps">
            {VALIDATIONS.map((v) => (
              <button key={v.label} onClick={() => setStamp(stamp === v.label ? "" : v.label)} className={`fp__stamp-btn${stamp === v.label ? " fp__stamp-btn--active" : ""}`}>
                <span>{v.emoji}</span><span>{v.label}</span>
              </button>
            ))}
          </div>
          <p className="fp__section-label">Comentário <span className="fp__optional">(opcional)</span></p>
          <textarea className="fp__textarea" placeholder="Escreva um comentário..." value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <div className="fp__actions">
            {hasExisting && <button className="fp__btn fp__btn--danger" onClick={handleClear}>🗑️ Remover</button>}
            <button className="fp__btn fp__btn--ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="fp__btn fp__btn--primary" onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "💾 Salvar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseCard({ response, patient, exercise, animIndex, session, onFeedbackSaved }) {
  const questions = exercise ? parseQuestions(exercise) : [];
  const answers   = parseAnswers(response);
  const answerMap = matchAnswersToQuestions(questions, answers);
  const visibleQA = questions.filter((q) => q.type !== "instruction" && answerMap[q.id]).map((q) => ({ q, val: answerMap[q.id] }));

  return (
    <article className="rv-card" style={{ "--anim-delay": `${animIndex * 60}ms` }}>
      <header className="rv-card__header">
        <div style={{display:'flex',justifyContent:'space-between',width:'100%',alignItems:'flex-start'}}>
          <div className="rv-card__exercise-name">{exercise?.title || "Exercício removido"}</div>
          <button className="rv-btn-pdf" onClick={() => exportClinicalPDF(response, patient, exercise, visibleQA)} title="Exportar PDF">📄 PDF</button>
        </div>
        <div className="rv-card__meta">
          {patient && (
            <div className="rv-card__patient">
              <AvatarDisplay name={patient.name} avatarUrl={patient.avatar_url} size={22} />
              <span className="rv-card__patient-name">{patient.name}</span>
            </div>
          )}
          <time className="rv-card__date">{formatDate(response.completed_at, { day:"2-digit", month:"2-digit", year:"numeric" })}</time>
        </div>
        <span className="rv-card__badge">✓ Concluído</span>
      </header>
      {visibleQA.length > 0 && (
        <div className="rv-card__qa">
          {visibleQA.map(({ q, val }) => (
            <div key={q.id} className="rv-qa">
              <p className="rv-qa__question">{q.text}</p>
              <p className="rv-qa__answer">{typeof val === 'object' ? JSON.stringify(val, null, 2) : val}</p>
            </div>
          ))}
        </div>
      )}
      <footer className="rv-card__footer">
        <FeedbackPanel response={response} session={session} onSaved={(updates) => onFeedbackSaved(response.id, updates)} />
      </footer>
    </article>
  );
}

const TABS = [
  { id: "responses", label: "💬 Respostas" },
  { id: "progress",  label: "📈 Progresso" },
];

export default function ResponsesView({ session }) {
  const [tab,        setTab]        = useState("responses");
  const [patients,   setPatients]   = useState([]);
  const [responses,  setResponses]  = useState([]);
  const [exercises,  setExercises]  = useState([]);
  const [selPatient, setSelPatient] = useState(null);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, ex] = await Promise.all([
          db.query("users", { select: "id,name,avatar_url", filter: { therapist_id: session.id, role: "patient" } }, session.access_token),
          db.query("exercises", {}, session.access_token),
        ]);
        const pList = Array.isArray(p) ? p : [];
        const pIds  = pList.map((pt) => pt.id);
        const allResp = pIds.length > 0 ? await db.query("responses", { filterIn: { patient_id: pIds }, order: "completed_at.desc" }, session.access_token).then((r) => (Array.isArray(r) ? r : [])) : [];
        if (active) { setPatients(pList); setExercises(Array.isArray(ex) ? ex : []); setResponses(allResp); }
      } catch (e) { toast.error("Erro: " + e.message); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  const handleFeedbackSaved = (responseId, updates) => setResponses((prev) => prev.map((r) => (r.id === responseId ? { ...r, ...updates } : r)));

  if (loading) return <SkeletonResponses />;

  const filtered = responses.filter((r) => {
    if (selPatient && r.patient_id !== selPatient.id) return false;
    if (search.trim()) {
      const patient  = patients.find((p) => p.id === r.patient_id);
      const exercise = exercises.find((e) => e.id === r.exercise_id);
      const needle   = search.toLowerCase();
      if (!patient?.name.toLowerCase().includes(needle) && !exercise?.title?.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="rv page-fade-in">
      <div className="page-header">
        <h2>Respostas dos Pacientes</h2>
        <p>Acompanhe respostas e evolução dos seus pacientes</p>
      </div>

      {/* Tabs */}
      <div className="rv-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`rv-tab${tab === t.id ? " rv-tab--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "progress" ? (
        <TherapistProgress session={session} />
      ) : (
        <>
          <div className="rv__controls">
            <div className="rv__search-wrap">
              <span className="rv__search-icon">🔍</span>
              <input type="search" className="rv__search" placeholder="Buscar por paciente ou exercício…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="rv__chips">
              <button className={`rv__chip${!selPatient ? " rv__chip--active" : ""}`} onClick={() => setSelPatient(null)}>Todos <span className="rv__chip-count">{responses.length}</span></button>
              {patients.map((p) => {
                const count = responses.filter((r) => r.patient_id === p.id).length;
                return (
                  <button key={p.id} className={`rv__chip rv__chip--patient${selPatient?.id === p.id ? " rv__chip--active" : ""}`} onClick={() => setSelPatient(selPatient?.id === p.id ? null : p)}>
                    <AvatarDisplay name={p.name} avatarUrl={p.avatar_url} size={20} />
                    <span className="rv__chip-name">{p.name.split(" ")[0]}</span>
                    <span className="rv__chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {<p className="rv__count">{filtered.length === 0 ? "Nenhuma resposta encontrada" : `${filtered.length} resposta${filtered.length !== 1 ? "s" : ""}`}</p>}
          {filtered.length === 0 ? <EmptyState icon="🔍" message="Nenhuma resposta encontrada." /> : (
            <div className="rv__grid">
              {filtered.map((r, i) => <ResponseCard key={r.id} response={r} animIndex={i} patient={patients.find((p) => p.id === r.patient_id)} exercise={exercises.find((e) => e.id === r.exercise_id)} session={session} onFeedbackSaved={handleFeedbackSaved} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
