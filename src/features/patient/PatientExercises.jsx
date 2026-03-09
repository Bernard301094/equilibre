import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { daysUntil } from "../../utils/dates";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import "./PatientExercises.css";

/* ── Due date chip ───────────────────────────────────────────── */
function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0)  return <span className="due-chip due-chip--late" aria-label="Atrasado">⚠️ Atrasado</span>;
  if (days <= 2) return <span className="due-chip due-chip--warn" aria-label={`Vence em ${days} dias`}>⏳ Vence em {days}d</span>;
  return (
    <span className="due-chip due-chip--ok" aria-label={`Data limite: ${new Date(dueDate).toLocaleDateString("pt-BR")}`}>
      📅 {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

/* ── Exercise card ───────────────────────────────────────────── */
function ExCard({ assign, isDone, exercises, onStart }) {
  const ex = exercises.find((e) => e.id === assign.exercise_id);
  if (!ex) return null;

  const qs       = parseQuestions(ex).filter((q) => q.type !== "instruction");
  /* CATEGORY_CLASS mapeia categorias para classes CSS do sistema */
  const catClass = CATEGORY_CLASS[ex.category] || "cat-outro";

  return (
    <div
      className={[
        "ex-card",
        catClass,
        isDone ? "ex-card--done" : "",
      ].filter(Boolean).join(" ")}
      onClick={() => !isDone && onStart(ex)}
      role={isDone ? "article" : "button"}
      tabIndex={isDone ? undefined : 0}
      aria-label={isDone ? `${ex.title} — concluído` : `Iniciar exercício: ${ex.title}`}
      onKeyDown={!isDone
        ? (e) => (e.key === "Enter" || e.key === " ") && onStart(ex)
        : undefined}
    >
      {/* Categoria */}
      <span className={`ex-cat ${catClass}`}>{ex.category}</span>

      {/* Título + descrição */}
      <h3 className="ex-card__title">{ex.title}</h3>
      {ex.description && (
        <p className="ex-card__desc">{ex.description}</p>
      )}

      {/* Footer */}
      <div className="ex-card__footer">
        <span className="ex-card__question-count">
          {qs.length} {qs.length === 1 ? "pergunta" : "perguntas"}
        </span>

        <div className="ex-card__actions">
          {!isDone && <DueChip dueDate={assign.due_date} />}

          {isDone ? (
            <span className="response-badge badge-done">✅ Concluído</span>
          ) : (
            <button className="btn-start" tabIndex={-1} aria-hidden="true">
              Começar →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Section label com linha decorativa ─────────────────────── */
function SectionLabel({ children }) {
  return (
    <div className="pex-section__label" aria-hidden="true">
      {children}
      <span className="pex-section__label-line" />
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
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
        setDone(Array.isArray(don)     ? don  : []);
        setExercises(Array.isArray(ex) ? ex   : []);
      } catch (e) {
        console.error("[PatientExercises]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  if (loading) {
    return (
      <div className="pex-loading" aria-live="polite">
        <span style={{ fontSize: "2rem" }} aria-hidden="true">📚</span>
        <p>Carregando exercícios…</p>
      </div>
    );
  }

  const hasContent = pending.length > 0 || done.length > 0;

  return (
    <div className="pex-page page-fade-in">

      {/* ── Header ── */}
      <header className="pex-header">
        <h2 className="pex-header__title">📚 Meus Exercícios</h2>
        <p className="pex-header__sub">
          Complete as tarefas recomendadas pela sua profissional.
        </p>
      </header>

      {/* ── Para fazer ── */}
      {pending.length > 0 && (
        <section className="pex-section" aria-label="Exercícios para fazer">
          <SectionLabel>Para fazer · {pending.length}</SectionLabel>
          <div className="pex-grid pex-grid--pending" role="list">
            {pending.map((a) => (
              <div key={a.id} role="listitem">
                <ExCard
                  assign={a}
                  isDone={false}
                  exercises={exercises}
                  onStart={onStart}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Concluídos ── */}
      {done.length > 0 && (
        <section className="pex-section" aria-label="Exercícios concluídos">
          <SectionLabel>Concluídos · {done.length}</SectionLabel>
          <div className="pex-grid pex-grid--done" role="list">
            {done.map((a) => (
              <div key={a.id} role="listitem">
                <ExCard
                  assign={a}
                  isDone={true}
                  exercises={exercises}
                  onStart={onStart}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {!hasContent && (
        <div className="pex-empty">
          <EmptyState
            icon="📭"
            message="Nenhum exercício atribuído ainda."
            sub="Aguarde a sua psicóloga enviar exercícios para você."
          />
        </div>
      )}

    </div>
  );
}