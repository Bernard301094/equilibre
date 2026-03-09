import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import CreateExerciseView from "./CreateExerciseView";
import "./ExercisesView.css";

export default function ExercisesView({ session }) {
  const [exercises,  setExercises]  = useState([]);
  const [editingEx,  setEditingEx]  = useState(null);
  const [previewEx,  setPreviewEx]  = useState(null);
  const [deletingEx, setDeletingEx] = useState(null);
  const [refresh,    setRefresh]    = useState(0);
  const [error,      setError]      = useState("");

  useEffect(() => {
    db.query("exercises", {}, session.access_token).then((r) => {
      const all = Array.isArray(r) ? r : [];
      setExercises(
        all.filter((ex) => !ex.therapist_id || ex.therapist_id === session.id)
      );
    });
  }, [session.id, session.access_token, refresh]);

  const confirmDelete = async () => {
    if (!deletingEx) return;
    setError("");
    try {
      await db.delete("exercises", { id: deletingEx.id }, session.access_token);
      setRefresh((r) => r + 1);
      setDeletingEx(null);
      if (previewEx?.id === deletingEx.id) setPreviewEx(null);
    } catch (e) {
      setError("Erro ao excluir exercício: " + e.message);
      setDeletingEx(null);
    }
  };

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editingEx) {
    return (
      <CreateExerciseView
        key={editingEx.id}
        session={session}
        initialExercise={editingEx}
        onSaved={() => {
          setEditingEx(null);
          setPreviewEx(null);
          setRefresh((r) => r + 1);
        }}
        onCancel={() => setEditingEx(null)}
      />
    );
  }

  // ── Preview mode ───────────────────────────────────────────────────────────
  if (previewEx) {
    const qs = parseQuestions(previewEx);
    return (
      <div className="page-fade-in ev-preview">
        <div className="ev-preview__header">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setPreviewEx(null)}
          >
            ← Voltar
          </button>
          <h2 className="ev-preview__heading">Vista Prévia</h2>
          <button
            className="btn btn-sage"
            onClick={() => setEditingEx(previewEx)}
          >
            ✏️ Editar Exercício
          </button>
        </div>

        <div className="ev-preview__card">
          <span className={`ex-cat ${CATEGORY_CLASS[previewEx.category] || ""}`}>
            {previewEx.category}
          </span>
          <h3 className="ev-preview__title">{previewEx.title}</h3>
          <p className="ev-preview__desc">{previewEx.description}</p>
        </div>

        <h4 className="ev-questions__label">
          Perguntas cadastradas ({qs.length})
        </h4>

        {qs.map((q, i) => (
          <div key={q.id || i} className="ev-question-card">
            <div className="ev-question-card__type">
              {i + 1}.{" "}
              {q.type === "instruction" ? "📢 Instrução"
               : q.type === "scale"     ? "🔢 Escala de 0 a 10"
               : q.type === "reflect"   ? "💭 Reflexão"
               : "📝 Resposta Aberta"}
            </div>
            <div className="ev-question-card__text">{q.text}</div>
            {q.type === "scale" && (
              <div className="ev-scale-preview">
                {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <div key={n} className="ev-scale-preview__dot">{n}</div>
                ))}
              </div>
            )}
            {(q.type === "open" || q.type === "reflect") && (
              <div className="ev-textarea-placeholder" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Library list ───────────────────────────────────────────────────────────
  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h2>Biblioteca de Exercícios</h2>
        <p>Clique num exercício para ver os detalhes ou editá-lo.</p>
      </div>

      {error && (
        <p className="ev-error-msg" role="alert">{error}</p>
      )}

      <div className="ev-grid">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="ev-ex-card"
            onClick={() => setPreviewEx(ex)}
            role="button"
            tabIndex={0}
            aria-label={`Ver exercício ${ex.title}`}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && setPreviewEx(ex)
            }
          >
            <div className="ev-ex-card__actions">
              <button
                aria-label={`Editar ${ex.title}`}
                title="Editar"
                className="ev-ex-card__action-btn ev-ex-card__action-btn--edit"
                onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}
              >
                ✏️
              </button>
              <button
                aria-label={`Excluir ${ex.title}`}
                title="Excluir"
                className="ev-ex-card__action-btn ev-ex-card__action-btn--delete"
                onClick={(e) => { e.stopPropagation(); setDeletingEx(ex); }}
              >
                🗑️
              </button>
            </div>

            <span className={`ex-cat ${CATEGORY_CLASS[ex.category] || ""}`}>
              {ex.category}
            </span>
            <div className="ev-ex-card__title">{ex.title}</div>
            <div className="ev-ex-card__desc">{ex.description}</div>
            <div className="ev-ex-card__count">
              📝 {parseQuestions(ex).length} perguntas
            </div>
          </div>
        ))}

        {exercises.length === 0 && (
          <div className="ev-empty">
            <EmptyState icon="📭" message="Nenhum exercício na biblioteca." />
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deletingEx && (
        <div
          className="ev-delete-overlay"
          onClick={() => setDeletingEx(null)}
        >
          <div
            className="ev-delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delex-title"
          >
            <span className="ev-delete-modal__icon" aria-hidden="true">
              🗑️
            </span>
            <div id="delex-title" className="ev-delete-modal__title">
              Excluir exercício?
            </div>
            <div className="ev-delete-modal__desc">
              Tem certeza que deseja excluir{" "}
              <strong>"{deletingEx.title}"</strong>?
              <br /><br />
              Esta ação removerá o exercício da biblioteca e das tarefas
              pendentes dos pacientes. As respostas antigas serão mantidas
              no histórico.
            </div>
            <div className="ev-delete-modal__actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeletingEx(null)}
              >
                Cancelar
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}