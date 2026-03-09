import { useState, useRef } from "react";
import db from "../../../services/db";
import { daysUntil } from "../../../utils/dates";
import "./AssignTab.css";

/* ── DueChip ──────────────────────────────────────────────── */
function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;

  if (days < 0) {
    return <span className="due-chip due-chip--late">Atrasado</span>;
  }
  if (days <= 2) {
    return <span className="due-chip due-chip--warn">Vence em {days}d</span>;
  }
  return (
    <span className="due-chip due-chip--ok">
      📅 {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

/* ── AssignTab ────────────────────────────────────────────── */
export default function AssignTab({
  patient, session, exercises, assignments, goal, onClose, onDataChange,
}) {
  const [localAssign, setLocalAssign] = useState(assignments);
  const [selected,    setSelected]    = useState([]);
  const [dueDates,    setDueDates]    = useState({});
  const [weeklyGoal,  setWeeklyGoal]  = useState(goal?.weekly_target ?? 3);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const inflightRef = useRef(false);

  const existingIds = localAssign.map((a) => a.exercise_id);
  const available   = exercises.filter((ex) => !existingIds.includes(ex.id));

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
        if (!existingIds.includes(exId)) {
          const inserted = await db.insert(
            "assignments",
            {
              id:           "a" + Date.now() + Math.random().toString(36).slice(2, 5),
              patient_id:   patient.id,
              exercise_id:  exId,
              therapist_id: session.id,
              assigned_at:  new Date().toISOString(),
              status:       "pending",
              due_date:     dueDates[exId] || null,
            },
            session.access_token
          );
          if (inserted) newAssigns.push(inserted);
        }
      }

      if (goal) {
        await db.update("goals", { id: goal.id }, { weekly_target: weeklyGoal }, session.access_token);
      } else {
        await db.insert(
          "goals",
          {
            id:           "g" + Date.now(),
            patient_id:   patient.id,
            therapist_id: session.id,
            weekly_target: weeklyGoal,
            created_at:   new Date().toISOString(),
          },
          session.access_token
        );
      }

      const updated = [...localAssign, ...newAssigns];
      setLocalAssign(updated);
      onDataChange({ assignments: updated });
      setSelected([]);
      setDueDates({});
    } catch (e) {
      setError("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  return (
    <div className="assign-tab">

      {/* ── Meta semanal ── */}
      <div className="assign-tab__goal-box">
        <div className="assign-tab__goal-label">🎯 Meta semanal de exercícios</div>
        <div className="assign-tab__goal-row">
          <label htmlFor="weekly-goal-range" className="sr-only">Meta semanal</label>
          <input
            id="weekly-goal-range"
            type="range"
            min="1"
            max="10"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(Number(e.target.value))}
            className="assign-tab__goal-range"
          />
          <span className="assign-tab__goal-value">{weeklyGoal}</span>
          <span className="assign-tab__goal-unit">por semana</span>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <p className="assign-tab__error" role="alert">{error}</p>
      )}

      {/* ── Exercícios atribuídos ── */}
      {localAssign.length > 0 && (
        <section className="assign-tab__section">
          <h4 className="assign-tab__section-label">Atribuídos</h4>
          <div className="assign-tab__assigned-list">
            {localAssign.map((a) => {
              const ex = exercises.find((e) => e.id === a.exercise_id);
              if (!ex) return null;
              return (
                <div key={a.id} className="assign-tab__assigned-row">
                  <span className="assign-tab__assigned-title">{ex.title}</span>

                  <div className="assign-tab__assigned-meta">
                    <DueChip dueDate={a.due_date} />
                    <span
                      className={[
                        "assign-tab__status-badge",
                        a.status === "done"
                          ? "assign-tab__status-badge--done"
                          : "assign-tab__status-badge--pending",
                      ].join(" ")}
                    >
                      {a.status === "done" ? "✓ Feito" : "⏳ Pendente"}
                    </span>
                  </div>

                  <button
                    className="assign-tab__remove-btn"
                    onClick={() => removeAssign(a.exercise_id)}
                    aria-label={`Remover ${ex.title}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Disponibles para añadir ── */}
      <section className="assign-tab__section">
        <h4 className="assign-tab__section-label">Adicionar à lista</h4>

        {available.length === 0 && (
          <p className="assign-tab__empty">Todos os exercícios já foram atribuídos.</p>
        )}

        <div className="assign-tab__pick-list">
          {available.map((ex) => {
            const isSelected = selected.includes(ex.id);
            return (
              <div key={ex.id} className="assign-tab__pick-wrap">
                <div
                  className={["assign-tab__pick", isSelected ? "assign-tab__pick--selected" : ""].filter(Boolean).join(" ")}
                  onClick={() => toggle(ex.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(ex.id)}
                >
                  <span className="assign-tab__pick-check" aria-hidden="true">
                    {isSelected ? "✓" : ""}
                  </span>
                  <span className="assign-tab__pick-title">{ex.title}</span>
                </div>

                {isSelected && (
                  <div className="assign-tab__due-row">
                    <label
                      htmlFor={`due-${ex.id}`}
                      className="assign-tab__due-label"
                    >
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

      {/* ── Footer de acciones ── */}
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
          aria-busy={saving}
        >
          {saving ? "Salvando..." : `Salvar${selected.length > 0 ? ` (${selected.length})` : ""}`}
        </button>
      </div>

    </div>
  );
}