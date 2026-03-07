import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { daysUntil } from "../../utils/dates";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";

function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0)  return <span className="due-chip due-late">Atrasado</span>;
  if (days <= 2) return <span className="due-chip due-warn">Vence em {days}d</span>;
  return (
    <span className="due-chip due-ok">
      {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

function ExCard({ assign, isDone, exercises, onStart }) {
  const ex = exercises.find((e) => e.id === assign.exercise_id);
  if (!ex) return null;

  const qs       = parseQuestions(ex);
  const catClass = CATEGORY_CLASS[ex.category] || "outro";

  return (
    <div
      className="ex-card"
      style={{ opacity: isDone ? 0.6 : 1, cursor: isDone ? "default" : "pointer" }}
      onClick={() => !isDone && onStart(ex)}
      role={isDone ? "article" : "button"}
      tabIndex={isDone ? undefined : 0}
      aria-label={isDone ? `${ex.title} — concluído` : `Iniciar exercício: ${ex.title}`}
      onKeyDown={!isDone ? (e) => (e.key === "Enter" || e.key === " ") && onStart(ex) : undefined}
    >
      <span className={`ex-cat ${catClass}`}>{ex.category}</span>
      <div className="ex-title">{ex.title}</div>
      <div className="ex-desc">{ex.description}</div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {qs.length} {qs.length === 1 ? "pergunta" : "perguntas"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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

  if (loading) return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</p>;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Meus Exercícios</h2>
        <p>Complete as tarefas recomendadas pela sua profissional.</p>
      </div>

      {pending.length > 0 && (
        <section aria-label="Exercícios para fazer">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 11 }}>
            Para fazer
          </div>
          <div className="grid-auto" style={{ marginBottom: 28 }}>
            {pending.map((a) => (
              <ExCard key={a.id} assign={a} isDone={false} exercises={exercises} onStart={onStart} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section aria-label="Exercícios concluídos">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 11 }}>
            Concluídos
          </div>
          <div className="grid-auto" style={{ marginBottom: 28 }}>
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