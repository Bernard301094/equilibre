import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { daysUntil } from "../../utils/dates";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import "./PatientExercises.css";

/* ── Due date chip ───────────────────────────────────────────────────────── */
function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0)  return <span className="due-chip due-chip--late">Atrasado</span>;
  if (days <= 2) return <span className="due-chip due-chip--warn">Vence em {days}d</span>;
  return (
    <span className="due-chip due-chip--ok">
      {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

/* ── Exercise card ───────────────────────────────────────────────────────── */
function ExCard({ assign, isDone, exercises, onStart }) {
  const ex = exercises.find((e) => e.id === assign.exercise_id);
  if (!ex) return null;

  const qs       = parseQuestions(ex);
  const catClass = CATEGORY_CLASS[ex.category] || "outro";

  return (
    <div
      className={`ex-card${isDone ? " ex-card--done" : ""}`}
      onClick={() => !isDone && onStart(ex)}
      role={isDone ? "article" : "button"}
      tabIndex={isDone ? undefined : 0}
      aria-label={isDone ? `${ex.title} — concluído` : `Iniciar exercício: ${ex.title}`}
      onKeyDown={!isDone ? (e) => (e.key === "Enter" || e.key === " ") && onStart(ex) : undefined}
    >
      <span className={`ex-cat ${catClass}`}>{ex.category}</span>
      <div className="ex-card__title">{ex.title}</div>
      <div className="ex-card__desc">{ex.description}</div>

      <div className="ex-card__footer">
        <span className="ex-card__question-count">
          {qs.length} {qs.length === 1 ? "pergunta" : "perguntas"}
        </span>
        <div className="ex-card__actions">
          {!isDone && <DueChip dueDate={assign.due_date} />}
          {isDone ? (
            <span className="response-badge badge-done">Concluído</span>
          ) : (
            <button className="btn btn-sage btn-sm" tabIndex={-1} aria-hidden="true">
              Começar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section label ───────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return <div className="exercises-section__label">{children}</div>;
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function PatientExercises({ session, onStart }) {
  const [pending,   setPending]   = useState([]);
  const [done,      setDone]      = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pend, don, ex] = await Promise.all([
          db.query("assignments", { filter: { patient_id: session.id, status: "pending" } }, session.access_token),
          db.query("assignments", { filter: { patient_id: session.id, status: "done"    } }, session.access_token),
          db.query("exercises",   {},                                                          session.access_token),
        ]);
        if (!active) return;
        setPending(Array.isArray(pend) ? pend : []);
        setDone(Array.isArray(don) ? don : []);
        setExercises(Array.isArray(ex) ? ex : []);
      } catch (e) {
        console.error("[PatientExercises]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  if (loading) return <p className="exercises-loading">Carregando...</p>;

  return (
    <div className="patient-exercises">
      <div className="page-header">
        <h2>Meus Exercícios</h2>
        <p>Complete as tarefas recomendadas pela sua profissional.</p>
      </div>

      {pending.length > 0 && (
        <section className="exercises-section" aria-label="Exercícios para fazer">
          <SectionLabel>Para fazer</SectionLabel>
          <div className="exercises-section__grid exercises-section__grid--pending">
            {pending.map((a) => (
              <ExCard key={a.id} assign={a} isDone={false} exercises={exercises} onStart={onStart} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="exercises-section" aria-label="Exercícios concluídos">
          <SectionLabel>Concluídos</SectionLabel>
          <div className="exercises-section__grid exercises-section__grid--done">
            {done.map((a) => (
              <ExCard key={a.id} assign={a} isDone={true} exercises={exercises} onStart={onStart} />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && done.length === 0 && (
        <EmptyState
          icon="📭"
          message="Nenhum exercício atribuído ainda."
          sub="Aguarde a sua psicóloga enviar exercícios para você."
        />
      )}
    </div>
  );
}