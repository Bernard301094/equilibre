import { useState, useRef, useEffect } from "react";
import db from "../../../services/db";
import { daysUntil } from "../../../utils/dates";
import "./AssignTab.css";

function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0) return <span className="due-chip due-chip--late">Atrasado</span>;
  if (days <= 2) return <span className="due-chip due-chip--warn">Vence em {days}d</span>;
  return (
    <span className="due-chip due-chip--ok">
      📅 {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

export default function AssignTab({ patient, session, exercises, assignments, goal, onClose, onDataChange }) {
  const [localAssign, setLocalAssign] = useState(assignments);
  const [selected,    setSelected]    = useState([]);
  const [dueDates,    setDueDates]    = useState({});
  const [weeklyGoal,  setWeeklyGoal]  = useState(goal?.weekly_target ?? 3);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const inflightRef = useRef(false);

  const [globalExercises, setGlobalExercises] = useState([]);
  const [activeTab, setActiveTab] = useState("my-list");

  useEffect(() => {
    db.query("global_exercises", { order: "created_at.desc" }, session.access_token)
      .then(res => setGlobalExercises(Array.isArray(res) ? res : []))
      .catch(e => console.error("Erro ao buscar modelos globais:", e));
  }, [session.access_token]);

  const existingIds   = localAssign.map((a) => a.exercise_id);
  const availableMyList = exercises.filter((ex) => !existingIds.includes(ex.id));
  const listToShow    = activeTab === "my-list" ? availableMyList : globalExercises;

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const removeAssign = async (exId) => {
    const a = localAssign.find((x) => x.exercise_id === exId);
    if (!a) return;
    try {
      await db.delete("assignments", { id: a.id }, session.access_token);
      const updated = localAssign.filter((x) => x.exercise_id !== exId);
      setLocalAssign(updated);
      onDataChange({ assignments: updated });
    } catch (e) {
      setError("Erro ao remover: " + e.message);
    }
  };

  const save = async () => {
    if (inflightRef.current || saving) return;
    inflightRef.current = true;
    setSaving(true);
    setError("");
    try {
      const newAssigns = [];

      for (const exId of selected) {
        let finalExId = exId;
        const isGlobal = globalExercises.find((g) => g.id === exId);

        // Clona o exercício global na tabela do terapeuta
        if (isGlobal) {
          const newId = "ex_" + Date.now() + Math.random().toString(36).slice(2, 6);
          await db.insert(
            "exercises",
            {
              id:           newId,
              title:        isGlobal.title,
              description:  isGlobal.description || "Modelo Oficial Equilibre",
              category:     isGlobal.category || "TCC",
              questions:    typeof isGlobal.questions === "string"
                              ? isGlobal.questions
                              : JSON.stringify(isGlobal.questions),
              therapist_id: session.id,
            },
            session.access_token
          );
          finalExId = newId;
        }

        if (isGlobal || !existingIds.includes(finalExId)) {
          // ⚠️  Não enviamos therapist_id aqui — a coluna não existe em assignments
          const inserted = await db.insert(
            "assignments",
            {
              id:          "a" + Date.now() + Math.random().toString(36).slice(2, 5),
              patient_id:  patient.id,
              exercise_id: finalExId,
              assigned_at: new Date().toISOString(),
              status:      "pending",
              due_date:    dueDates[exId] || null,
            },
            session.access_token
          );
          if (inserted) newAssigns.push(inserted);
        }
      }

      if (goal) {
        await db.update(
          "goals",
          { id: goal.id },
          { weekly_target: weeklyGoal },
          session.access_token
        );
      } else {
        await db.insert(
          "goals",
          {
            id:            "g" + Date.now(),
            patient_id:    patient.id,
            therapist_id:  session.id,
            weekly_target: weeklyGoal,
            created_at:    new Date().toISOString(),
          },
          session.access_token
        );
      }

      const updated = [...localAssign, ...newAssigns];
      setLocalAssign(updated);
      onDataChange({ assignments: updated });
      setSelected([]);
      setDueDates({});
      if (activeTab === "global") setActiveTab("my-list");

    } catch (e) {
      setError("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  return (
    <div className="assign-tab">
      <div className="assign-tab__goal-box">
        <div className="assign-tab__goal-label">🎯 Meta semanal de exercícios</div>
        <div className="assign-tab__goal-row">
          <input
            id="weekly-goal-range"
            type="range"
            min="1" max="10"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(Number(e.target.value))}
            className="assign-tab__goal-range"
          />
          <span className="assign-tab__goal-value">{weeklyGoal}</span>
          <span className="assign-tab__goal-unit">por semana</span>
        </div>
      </div>

      {error && <p className="assign-tab__error" role="alert">{error}</p>}

      {localAssign.length > 0 && (
        <section className="assign-tab__section">
          <h4 className="assign-tab__section-label">Atribuídos Atualmente</h4>
          <div className="assign-tab__assigned-list">
            {localAssign.map((a) => {
              const ex = exercises.find((e) => e.id === a.exercise_id);
              if (!ex) {
                return (
                  <div key={a.id} className="assign-tab__assigned-row">
                    <span className="assign-tab__assigned-title" style={{ color: "#ef4444", fontWeight: "bold" }}>
                      ⚠️ Exercício Eliminado
                    </span>
                    <button
                      className="assign-tab__remove-btn"
                      onClick={() => removeAssign(a.exercise_id)}
                      title="Remover atribuição inválida"
                    >
                      ✕
                    </button>
                  </div>
                );
              }
              return (
                <div key={a.id} className="assign-tab__assigned-row">
                  <span className="assign-tab__assigned-title">{ex.title}</span>
                  <div className="assign-tab__assigned-meta">
                    <DueChip dueDate={a.due_date} />
                    <span className={[
                      "assign-tab__status-badge",
                      a.status === "done"
                        ? "assign-tab__status-badge--done"
                        : "assign-tab__status-badge--pending",
                    ].join(" ")}>
                      {a.status === "done" ? "✓ Feito" : "⏳ Pendente"}
                    </span>
                  </div>
                  <button
                    className="assign-tab__remove-btn"
                    onClick={() => removeAssign(a.exercise_id)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="assign-tab__section">
        <h4 className="assign-tab__section-label" style={{ marginBottom: "5px" }}>
          Adicionar Novo Exercício
        </h4>

        <div className="assign-tab__tabs-container">
          <button
            className={`assign-tab__tab-btn ${
              activeTab === "my-list" ? "assign-tab__tab-btn--active-my" : ""
            }`}
            onClick={() => setActiveTab("my-list")}
          >
            👤 Meus Exercícios
          </button>
          <button
            className={`assign-tab__tab-btn ${
              activeTab === "global" ? "assign-tab__tab-btn--active-global" : ""
            }`}
            onClick={() => setActiveTab("global")}
          >
            ✨ Modelos Equilibre
          </button>
        </div>

        {listToShow.length === 0 && (
          <p className="assign-tab__empty">
            {activeTab === "my-list"
              ? "Todos os seus exercícios já foram atribuídos."
              : "Nenhum modelo global disponível."}
          </p>
        )}

        <div className="assign-tab__pick-list">
          {listToShow.map((ex) => {
            const isSelected = selected.includes(ex.id);
            return (
              <div key={ex.id} className="assign-tab__pick-wrap">
                <div
                  className={[
                    "assign-tab__pick",
                    isSelected ? "assign-tab__pick--selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => toggle(ex.id)}
                >
                  <span className="assign-tab__pick-check">{isSelected ? "✓" : ""}</span>
                  <span className="assign-tab__pick-title">
                    {ex.title}{" "}
                    {activeTab === "global" && (
                      <span className="assign-tab__badge-official">OFICIAL</span>
                    )}
                  </span>
                </div>
                {isSelected && (
                  <div className="assign-tab__due-row">
                    <label htmlFor={`due-${ex.id}`} className="assign-tab__due-label">
                      📅 Prazo:
                    </label>
                    <input
                      id={`due-${ex.id}`}
                      type="date"
                      className="assign-tab__due-input"
                      value={dueDates[ex.id] || ""}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setDueDates((d) => ({ ...d, [ex.id]: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="assign-tab__footer">
        <button
          className="assign-tab__btn assign-tab__btn--cancel"
          onClick={onClose}
        >
          Fechar
        </button>
        <button
          className="assign-tab__btn assign-tab__btn--save"
          onClick={save}
          disabled={saving || selected.length === 0}
        >
          {saving ? "Salvando..." : `Atribuir${selected.length > 0 ? ` (${selected.length})` : ""}`}
        </button>
      </div>
    </div>
  );
}
