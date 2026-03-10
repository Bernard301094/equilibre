import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { formatDate } from "../../utils/dates";
import { SkeletonResponses } from "../../components/ui/Skeleton";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";
import toast from "../../utils/toast";
import "./ResponsesView.css";

const VALIDATIONS = [
  { emoji: "👏", label: "Parabéns!"       },
  { emoji: "💪", label: "Continue assim!" },
  { emoji: "🌱", label: "Bom progresso!"  },
  { emoji: "🔄", label: "Reflita mais"    },
  { emoji: "❤️", label: "Aqui por você"   },
];

/* ── FeedbackPanel ─────────────────────────────────────────── */
function FeedbackPanel({ response, session, onSaved }) {
  const [open,   setOpen]   = useState(false);
  const [text,   setText]   = useState(response.therapist_note  ?? "");
  const [stamp,  setStamp]  = useState(response.therapist_stamp ?? "");
  const [saving, setSaving] = useState(false);
  const inflightRef = useRef(false);

  const hasExisting = !!(response.therapist_note || response.therapist_stamp);

  const handleSave = async () => {
    if (inflightRef.current || saving) return;
    if (!text.trim() && !stamp) {
      toast.error("Escreva um comentário ou selecione um selo.");
      return;
    }
    inflightRef.current = true;
    setSaving(true);
    try {
      await db.update(
        "responses",
        { id: response.id },
        {
          therapist_note:  text.trim() || null,
          therapist_stamp: stamp || null,
          noted_at:        new Date().toISOString(),
        },
        session.access_token
      );
      toast.success("Feedback enviado!");
      onSaved({ therapist_note: text.trim() || null, therapist_stamp: stamp || null });
      setOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  const handleClear = async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      await db.update(
        "responses",
        { id: response.id },
        { therapist_note: null, therapist_stamp: null, noted_at_at: null },
        session.access_token
      );
      setText("");
      setStamp("");
      toast.success("Feedback removido.");
      onSaved({ therapist_note: null, therapist_stamp: null });
      setOpen(false);
    } catch (e) {
      toast.error("Erro ao remover: " + e.message);
    } finally {
      inflightRef.current = false;
    }
  };

  return (
    <div className="fp">
      {/* Existing feedback summary */}
      {hasExisting && !open && (
        <div className="fp__summary">
          {response.therapist_stamp && (
            <span className="fp__summary-emoji" aria-hidden="true">
              {VALIDATIONS.find((v) => v.label === response.therapist_stamp)?.emoji ?? "💬"}
            </span>
          )}
          <div className="fp__summary-body">
            {response.therapist_stamp && (
              <span className="fp__summary-stamp">{response.therapist_stamp}</span>
            )}
            {response.therapist_note && (
              <span className="fp__summary-note">"{response.therapist_note}"</span>
            )}
          </div>
          <button
            className="fp__edit-btn"
            onClick={() => setOpen(true)}
            aria-label="Editar feedback"
          >
            ✏️ Editar
          </button>
        </div>
      )}

      {!open && (
        <button
          className={`fp__toggle${hasExisting ? " fp__toggle--has" : ""}`}
          onClick={() => setOpen(true)}
        >
          {hasExisting ? "Ver feedback" : "💬 Deixar feedback"}
        </button>
      )}

      {open && (
        <div className="fp__panel">
          <p className="fp__section-label">Selos rápidos</p>
          <div className="fp__stamps">
            {VALIDATIONS.map((v) => (
              <button
                key={v.label}
                onClick={() => setStamp(stamp === v.label ? "" : v.label)}
                className={`fp__stamp-btn${stamp === v.label ? " fp__stamp-btn--active" : ""}`}
              >
                <span aria-hidden="true">{v.emoji}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>

          <p className="fp__section-label">Comentário <span className="fp__optional">(opcional)</span></p>
          <label htmlFor={`feedback-${response.id}`} className="sr-only">
            Comentário de feedback
          </label>
          <textarea
            id={`feedback-${response.id}`}
            className="fp__textarea"
            placeholder="Escreva um comentário de encorajamento ou orientação..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />

          <div className="fp__actions">
            {hasExisting && (
              <button className="fp__btn fp__btn--danger" onClick={handleClear}>
                🗑️ Remover
              </button>
            )}
            <button className="fp__btn fp__btn--ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="fp__btn fp__btn--primary"
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Salvando…" : "💾 Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ResponseCard ──────────────────────────────────────────── */
function ResponseCard({ response, patient, exercise, animIndex, session, onFeedbackSaved }) {
  const questions = exercise ? parseQuestions(exercise) : [];
  const answers   = parseAnswers(response);
  const answerMap = matchAnswersToQuestions(questions, answers);

  const visibleQA = questions
    .filter((q) => q.type !== "instruction" && answerMap[q.id])
    .map((q)  => ({ q, val: answerMap[q.id] }));

  return (
    <article
      className="rv-card"
      style={{ "--anim-delay": `${animIndex * 60}ms` }}
    >
      {/* ── Card header ── */}
      <header className="rv-card__header">
        <div className="rv-card__exercise-name">
          {exercise?.title || "Exercício removido"}
        </div>

        <div className="rv-card__meta">
          {patient && (
            <div className="rv-card__patient">
              <AvatarDisplay
                name={patient.name}
                avatarUrl={patient.avatar_url}
                size={22}
              />
              <span className="rv-card__patient-name">{patient.name}</span>
            </div>
          )}
          <time className="rv-card__date">
            {formatDate(response.completed_at, {
              day: "2-digit", month: "2-digit", year: "numeric",
            })}
          </time>
        </div>

        <span className="rv-card__badge" aria-label="Exercício concluído">
          ✓ Concluído
        </span>
      </header>

      {/* ── Q&A body ── */}
      {visibleQA.length > 0 && (
        <div className="rv-card__qa">
          {visibleQA.map(({ q, val }) => (
            <div key={q.id} className="rv-qa">
              <p className="rv-qa__question">{q.text}</p>
              <p className="rv-qa__answer">{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback ── */}
      <footer className="rv-card__footer">
        <FeedbackPanel
          response={response}
          session={session}
          onSaved={(updates) => onFeedbackSaved(response.id, updates)}
        />
      </footer>
    </article>
  );
}

/* ── ResponsesView ─────────────────────────────────────────── */
export default function ResponsesView({ session }) {
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
          db.query(
            "users",
            { select: "id,name,avatar_url", filter: { therapist_id: session.id, role: "patient" } },
            session.access_token
          ),
          db.query("exercises", {}, session.access_token),
        ]);

        const pList = Array.isArray(p)  ? p  : [];
        const pIds  = pList.map((pt) => pt.id);

        const allResp = pIds.length > 0
          ? await db.query(
              "responses",
              { filterIn: { patient_id: pIds }, order: "completed_at.desc" },
              session.access_token
            ).then((r) => (Array.isArray(r) ? r : []))
          : [];

        if (active) {
          setPatients(pList);
          setExercises(Array.isArray(ex) ? ex : []);
          setResponses(allResp);
        }
      } catch (e) {
        console.error("[ResponsesView]", e);
        toast.error("Erro ao carregar respostas: " + e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  const handleFeedbackSaved = (responseId, updates) => {
    setResponses((prev) =>
      prev.map((r) => (r.id === responseId ? { ...r, ...updates } : r))
    );
  };

  if (loading) return <SkeletonResponses />;

  /* Filtragem */
  const filtered = responses.filter((r) => {
    if (selPatient && r.patient_id !== selPatient.id) return false;
    if (search.trim()) {
      const patient  = patients.find((p) => p.id === r.patient_id);
      const exercise = exercises.find((e) => e.id === r.exercise_id);
      const needle   = search.toLowerCase();
      if (
        !patient?.name.toLowerCase().includes(needle) &&
        !exercise?.title?.toLowerCase().includes(needle)
      ) return false;
    }
    return true;
  });

  return (
    <div className="rv page-fade-in">

      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Respostas dos Pacientes</h2>
        <p>Acompanhe e dê feedback às respostas dos exercícios</p>
      </div>

      {/* ── Sticky controls bar ── */}
      <div className="rv__controls">

        {/* Search */}
        <div className="rv__search-wrap">
          <span className="rv__search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="rv__search"
            placeholder="Buscar por paciente ou exercício…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar respostas"
          />
        </div>

        {/* Patient filter chips */}
        <div className="rv__chips" role="group" aria-label="Filtrar por paciente">
          <button
            className={`rv__chip${!selPatient ? " rv__chip--active" : ""}`}
            onClick={() => setSelPatient(null)}
            aria-pressed={!selPatient}
          >
            Todos
            <span className="rv__chip-count">{responses.length}</span>
          </button>

          {patients.map((p) => {
            const count = responses.filter((r) => r.patient_id === p.id).length;
            return (
              <button
                key={p.id}
                className={`rv__chip rv__chip--patient${selPatient?.id === p.id ? " rv__chip--active" : ""}`}
                onClick={() => setSelPatient(selPatient?.id === p.id ? null : p)}
                aria-pressed={selPatient?.id === p.id}
              >
                <AvatarDisplay
                  name={p.name}
                  avatarUrl={p.avatar_url}
                  size={20}
                />
                <span className="rv__chip-name">{p.name.split(" ")[0]}</span>
                <span className="rv__chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results count ── */}
      {!loading && (
        <p className="rv__count">
          {filtered.length === 0
            ? "Nenhuma resposta encontrada"
            : `${filtered.length} resposta${filtered.length !== 1 ? "s" : ""}`}
          {selPatient ? ` de ${selPatient.name.split(" ")[0]}` : ""}
          {search ? ` para "${search}"` : ""}
        </p>
      )}

      {/* ── Cards grid ── */}
      {filtered.length === 0 ? (
        <EmptyState icon="🔍" message="Nenhuma resposta encontrada." />
      ) : (
        <div className="rv__grid">
          {filtered.map((r, i) => (
            <ResponseCard
              key={r.id}
              response={r}
              animIndex={i}
              patient={patients.find((p) => p.id === r.patient_id)}
              exercise={exercises.find((e) => e.id === r.exercise_id)}
              session={session}
              onFeedbackSaved={handleFeedbackSaved}
            />
          ))}
        </div>
      )}
    </div>
  );
}