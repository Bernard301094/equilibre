import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { daysUntil } from "../../utils/dates";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState  from "../../components/ui/EmptyState";
import ExercisePage from "./ExercisePage";
import "./PatientExercises.css";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

async function fetchExercisesByIds(ids, token) {
  if (!ids || ids.length === 0) return [];
  const list = ids.map(encodeURIComponent).join(",");
  const url  = `${SUPA_URL}/rest/v1/exercises?id=in.(${list})`;
  const res  = await fetch(url, {
    cache: "no-store",
    headers: {
      apikey:         SUPA_KEY,
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ─ Due date chip ──────────────────────────────────────── */
function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0)  return <span className="due-chip due-chip--late">⚠️ Atrasado</span>;
  if (days <= 2) return <span className="due-chip due-chip--warn">⏳ Vence em {days}d</span>;
  return (
    <span className="due-chip due-chip--ok">
      📅 {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

/* ─ Exercise card ──────────────────────────────────────── */
function ExCard({ assign, isDone, exercises, onStart }) {
  const ex = exercises.find((e) => e.id === assign.exercise_id);
  if (!ex) return null;

  const qs       = parseQuestions(ex).filter((q) => q.type !== "instruction");
  const catClass = CATEGORY_CLASS[ex.category] || "cat-outro";

  return (
    <div
      className={["ex-card", catClass, isDone ? "ex-card--done" : ""].filter(Boolean).join(" ")}
      onClick={() => !isDone && onStart(ex)}
      role={isDone ? "article" : "button"}
      tabIndex={isDone ? undefined : 0}
      aria-label={isDone ? `${ex.title} — concluído` : `Iniciar exercício: ${ex.title}`}
      onKeyDown={!isDone ? (e) => (e.key === "Enter" || e.key === " ") && onStart(ex) : undefined}
    >
      <span className={`ex-cat ${catClass}`}>{ex.category}</span>
      <h3 className="ex-card__title">{ex.title}</h3>
      {ex.description && <p className="ex-card__desc">{ex.description}</p>}
      <div className="ex-card__footer">
        <span className="ex-card__question-count">
          {qs.length} {qs.length === 1 ? "pergunta" : "perguntas"}
        </span>
        <div className="ex-card__actions">
          {!isDone && <DueChip dueDate={assign.due_date} />}
          {isDone
            ? <span className="response-badge badge-done">✅ Concluído</span>
            : <button className="btn-start" tabIndex={-1} aria-hidden="true">Começar →</button>
          }
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="pex-section__label" aria-hidden="true">
      {children}
      <span className="pex-section__label-line" />
    </div>
  );
}

/* ─ Main ──────────────────────────────────────────────── */
export default function PatientExercises({ session }) {
  const [pending,         setPending]         = useState([]);
  const [done,            setDone]            = useState([]);
  const [exercises,       setExercises]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [activeExercise,  setActiveExercise]  = useState(null); // ← exercício aberto

  const loadData = async () => {
    try {
      const [pend, don] = await Promise.all([
        db.query("assignments", { filter: { patient_id: session.id, status: "pending" } }, session.access_token),
        db.query("assignments", { filter: { patient_id: session.id, status: "done"    } }, session.access_token),
      ]);

      const pendArr = Array.isArray(pend) ? pend : [];
      const donArr  = Array.isArray(don)  ? don  : [];

      const ids = [...new Set([...pendArr, ...donArr].map((a) => a.exercise_id).filter(Boolean))];
      const exArr = ids.length > 0 ? await fetchExercisesByIds(ids, session.access_token) : [];

      setPending(pendArr);
      setDone(donArr);
      setExercises(Array.isArray(exArr) ? exArr : []);
    } catch (e) {
      console.error("[PatientExercises]", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, session.access_token]);

  // Quando o paciente conclui o exercício, fecha e recarrega os dados
  const handleBack = () => {
    setActiveExercise(null);
    setLoading(true);
    loadData();
  };

  // ← Se há exercício ativo, mostra o player em tela cheia
  if (activeExercise) {
    return (
      <ExercisePage
        exercise={activeExercise}
        session={session}
        onBack={handleBack}
      />
    );
  }

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
      <header className="pex-header">
        <h2 className="pex-header__title">📚 Meus Exercícios</h2>
        <p className="pex-header__sub">Complete as tarefas recomendadas pela sua profissional.</p>
      </header>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</p>
      )}

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
                  onStart={setActiveExercise}
                />
              </div>
            ))}
          </div>
        </section>
      )}

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
                  onStart={setActiveExercise}
                />
              </div>
            ))}
          </div>
        </section>
      )}

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
