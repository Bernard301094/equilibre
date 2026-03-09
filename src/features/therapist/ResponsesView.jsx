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
        { therapist_note: null, therapist_stamp: null, noted_at: null },
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
          {response.therapist_note && (
            <span className="fp__summary-note">"{response.therapist_note}"</span>
          )}
          {!response.therapist_note && response.therapist_stamp && (
            <span className="fp__summary-stamp">{response.therapist_stamp}</span>
          )}
          <button
            className="btn btn-outline btn-sm fp__edit-btn"
            onClick={() => setOpen(true)}
          >
            ✏️ Editar
          </button>
        </div>
      )}

      {/* Toggle button */}
      {!open && (
        <button
          className={`btn btn-outline btn-sm fp__toggle${hasExisting ? " fp__toggle--existing" : ""}`}
          onClick={() => setOpen(true)}
        >
          {hasExisting ? "Ver feedback" : "💬 Deixar feedback"}
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div className="fp__panel">

          <div className="fp__section-label">Selos rápidos</div>
          <div className="fp__stamps">
            {VALIDATIONS.map((v) => (
              <button
                key={v.label}
                onClick={() => setStamp(stamp === v.label ? "" : v.label)}
                className={`fp__stamp-btn${stamp === v.label ? " fp__stamp-btn--active" : ""}`}
              >
                <span aria-hidden="true">{v.emoji}</span>
                {v.label}
              </button>
            ))}
          </div>

          <div className="fp__section-label">Comentário (opcional)</div>
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
              <button
                className="btn btn-outline btn-sm fp__btn-remove"
                onClick={handleClear}
              >
                🗑️ Remover
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="btn btn-sage btn-sm"
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResponsesView({ session }) {
  const [patients,   setPatients]   = useState([]);
  const [responses,  setResponses]  = useState([]);
  const [exercises,  setExercises]  = useState([]);
  const [selPatient, setSelPatient] = useState(null);
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

        const pList = Array.isArray(p) ? p : [];
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

  const filtered = selPatient
    ? responses.filter((r) => r.patient_id === selPatient.id)
    : responses;

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h2>Respostas dos Pacientes</h2>
        <p>Acompanhe o que seus pacientes responderam nos exercícios</p>
      </div>

      <div className="rv-layout">

        {/* ── Patient filter sidebar ── */}
        <aside className="card rv-filter">
          <h3 className="rv-filter__title">Filtrar por paciente</h3>

          <div
            role="button"
            tabIndex={0}
            className={`rv-filter__row${!selPatient ? " rv-filter__row--active" : ""}`}
            onClick={() => setSelPatient(null)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelPatient(null)}
            aria-pressed={!selPatient}
          >
            Todos os pacientes
          </div>

          {patients.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={`rv-filter__row rv-filter__row--patient${selPatient?.id === p.id ? " rv-filter__row--active" : ""}`}
              onClick={() => setSelPatient(p)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelPatient(p)}
              aria-pressed={selPatient?.id === p.id}
            >
              <AvatarDisplay
                name={p.name}
                avatarUrl={p.avatar_url}
                size={32}
                className="rv-filter__avatar"
              />
              <span className={`rv-filter__name${selPatient?.id === p.id ? " rv-filter__name--active" : ""}`}>
                {p.name}
              </span>
            </div>
          ))}

          {patients.length === 0 && (
            <p className="rv-filter__empty">Nenhum paciente ainda.</p>
          )}
        </aside>

        {/* ── Response list ── */}
        <div className="rv-responses">
          {filtered.length === 0 && (
            <EmptyState icon="🔍" message="Nenhuma resposta encontrada." />
          )}

          {filtered.map((r) => {
            const patient   = patients.find((p) => p.id === r.patient_id);
            const exercise  = exercises.find((e) => e.id === r.exercise_id);
            const questions = exercise ? parseQuestions(exercise) : [];
            const answers   = parseAnswers(r);
            const answerMap = matchAnswersToQuestions(questions, answers);

            return (
              <div key={r.id} className="card rv-response-card">

                {/* Card header */}
                <div className="rv-response-card__header">
                  <div className="rv-response-card__meta">
                    <div className="rv-response-card__title">
                      {exercise?.title || "Exercício removido"}
                    </div>
                    <div className="rv-response-card__sub">
                      {patient && (
                        <AvatarDisplay
                          name={patient.name}
                          avatarUrl={patient.avatar_url}
                          size={16}
                        />
                      )}
                      <span>
                        {patient?.name} ·{" "}
                        {formatDate(r.completed_at, {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="rv-response-card__badge">✓ Concluído</span>
                </div>

                {/* Q&A */}
                <div className="rv-response-card__answers">
                  {questions.map((q) => {
                    if (q.type === "instruction") return null;
                    const val = answerMap[q.id];
                    if (!val) return null;
                    return (
                      <div key={q.id} className="rv-qa">
                        <div className="rv-qa__question">{q.text}</div>
                        <div className="rv-qa__answer">{val}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Therapist feedback */}
                <div className="rv-response-card__feedback">
                  <FeedbackPanel
                    response={r}
                    session={session}
                    onSaved={(updates) => handleFeedbackSaved(r.id, updates)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}