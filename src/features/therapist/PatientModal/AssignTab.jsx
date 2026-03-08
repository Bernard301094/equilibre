import { useState, useRef } from "react";
import db from "../../../services/db";
import { daysUntil } from "../../../utils/dates";

function DueChip({ dueDate }) {
  const days = daysUntil(dueDate);
  if (days === null) return null;
  if (days < 0)  return <span className="due-chip due-late">Atrasado</span>;
  if (days <= 2) return <span className="due-chip due-warn">Vence em {days}d</span>;
  return (
    <span className="due-chip due-ok">
      📅 {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
    </span>
  );
}

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
            id: "g" + Date.now(), patient_id: patient.id,
            therapist_id: session.id, weekly_target: weeklyGoal,
            created_at: new Date().toISOString(),
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
    <>
      {/* ── Weekly goal slider ── */}
      <div className="at-goal-box">
        <div className="at-goal-label">🎯 Meta semanal de exercícios</div>
        <div className="at-goal-row">
          <label htmlFor="weekly-goal-range" className="sr-only">Meta semanal</label>
          <input
            id="weekly-goal-range"
            type="range"
            min="1"
            max="10"
            value={weeklyGoal}
            onChange={(e) => setWeeklyGoal(Number(e.target.value))}
            className="at-goal-range"
          />
          <span className="at-goal-val">{weeklyGoal}</span>
          <span className="at-goal-unit">por semana</span>
        </div>
      </div>

      {error && <p className="error-msg" role="alert">{error}</p>}

      {/* ── Assigned exercises ── */}
      {localAssign.length > 0 && (
        <div className="at-section">
          <div className="at-section-label">Atribuídos</div>
          {localAssign.map((a) => {
            const ex = exercises.find((e) => e.id === a.exercise_id);
            if (!ex) return null;
            return (
              <div key={a.id} className="at-assigned-row">
                <span className="at-assigned-title">{ex.title}</span>
                <DueChip dueDate={a.due_date} />
                <span className={`response-badge ${a.status === "done" ? "badge-done" : "badge-pending"}`}>
                  {a.status === "done" ? "✓ Feito" : "⏳ Pendente"}
                </span>
                <button
                  onClick={() => removeAssign(a.exercise_id)}
                  aria-label={`Remover ${ex.title}`}
                  className="at-remove-btn"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Available to add ── */}
      <div className="at-section-label">Adicionar à lista</div>
      {exercises.filter((ex) => !existingIds.includes(ex.id)).map((ex) => (
        <div key={ex.id}>
          <div
            className={`ex-pick${selected.includes(ex.id) ? " selected" : ""} at-ex-pick`}
            onClick={() => toggle(ex.id)}
            role="checkbox"
            aria-checked={selected.includes(ex.id)}
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggle(ex.id)}
            style={{ marginBottom: selected.includes(ex.id) ? 4 : 7 }}
          >
            <div className="check" aria-hidden="true">{selected.includes(ex.id) ? "✓" : ""}</div>
            <div className="at-ex-title">{ex.title}</div>
          </div>

          {selected.includes(ex.id) && (
            <div className="at-due-row">
              <label htmlFor={`due-${ex.id}`} className="at-due-label">📅 Prazo:</label>
              <input
                id={`due-${ex.id}`}
                type="date"
                className="at-due-input"
                value={dueDates[ex.id] || ""}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDueDates((d) => ({ ...d, [ex.id]: e.target.value }))}
              />
            </div>
          )}
        </div>
      ))}

      {/* ── Footer actions ── */}
      <div className="at-footer">
        <button className="btn btn-outline" onClick={onClose}>Fechar</button>
        <button
          className="btn btn-sage"
          onClick={save}
          disabled={saving || selected.length === 0}
          aria-busy={saving}
        >
          {saving ? "Salvando..." : "Salvar Atribuições"}
        </button>
      </div>
    </>
  );
}