import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import CreateExerciseView from "./CreateExerciseView";
import "./ExercisesView.css";

export default function ExercisesView({ session }) {
  const [exercises, setExercises] = useState([]);
  const [globalExercises, setGlobalExercises] = useState([]); // Nova: Lista global
  const [activeTab, setActiveTab] = useState("my-list"); // Nova: Controle de abas
  const [editingEx, setEditingEx] = useState(null);
  const [previewEx, setPreviewEx] = useState(null);
  const [deletingEx, setDeletingEx] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = session.access_token;

    // Busca exercícios privados
    const fetchPrivate = db.query("exercises", {}, token).then((r) => {
      const all = Array.isArray(r) ? r : [];
      setExercises(all.filter((ex) => !ex.therapist_id || ex.therapist_id === session.id));
    });

    // Busca exercícios globais (da biblioteca do admin)
    const fetchGlobal = db.query("global_exercises", { order: "created_at.desc" }, token)
      .then((r) => setGlobalExercises(Array.isArray(r) ? r : []))
      .catch(() => setGlobalExercises([])); // Falha silenciosa se a tabela não existir ainda

    Promise.all([fetchPrivate, fetchGlobal]).finally(() => setLoading(false));
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

  // ── Função de Importação ───────────────────────────────────────────────────
  const handleImport = async (globalEx) => {
    setError("");
    try {
      // Clonamos o exercício para a lista da terapeuta
      await db.insert("exercises", {
        title: globalEx.title,
        description: globalEx.description,
        category: globalEx.category || "Geral",
        questions: typeof globalEx.questions === 'string' ? globalEx.questions : JSON.stringify(globalEx.questions),
        therapist_id: session.id,
        is_template: false
      }, session.access_token);

      alert(`"${globalEx.title}" importado com sucesso!`);
      setActiveTab("my-list");
      setRefresh(r => r + 1);
    } catch (e) {
      setError("Erro ao importar modelo: " + e.message);
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
    const isGlobal = !exercises.find(e => e.id === previewEx.id);

    return (
      <div className="page-fade-in ev-preview">
        <div className="ev-preview__header">
          <button className="btn btn-outline btn-sm" onClick={() => setPreviewEx(null)}>← Voltar</button>
          <h2 className="ev-preview__heading">Vista Prévia</h2>
          {!isGlobal ? (
            <button className="btn btn-sage" onClick={() => setEditingEx(previewEx)}>✏️ Editar Exercício</button>
          ) : (
            <button className="btn btn-sage" onClick={() => handleImport(previewEx)}>📥 Importar para Minha Lista</button>
          )}
        </div>

        <div className="ev-preview__card">
          <span className={`ex-cat ${CATEGORY_CLASS[previewEx.category] || ""}`}>{previewEx.category}</span>
          <h3 className="ev-preview__title">{previewEx.title}</h3>
          <p className="ev-preview__desc">{previewEx.description}</p>
        </div>

        <h4 className="ev-questions__label">Perguntas cadastradas ({qs.length})</h4>
        {qs.map((q, i) => (
          <div key={q.id || i} className="ev-question-card">
            <div className="ev-question-card__type">
              {i + 1}. {q.type === "instruction" ? "📢 Instrução" : q.type === "scale" ? "🔢 Escala" : "📝 Resposta"}
            </div>
            <div className="ev-question-card__text">{q.text}</div>
          </div>
        ))}
      </div>
    );
  }

  // ── Main List ──────────────────────────────────────────────────────────────
  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h2>Biblioteca de Exercícios</h2>
        <div className="ev-tabs">
          <button 
            className={`ev-tab-btn ${activeTab === 'my-list' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-list')}
          >
            👤 Meus Criados ({exercises.length})
          </button>
          <button 
            className={`ev-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            ✨ Modelos Equilibre ({globalExercises.length})
          </button>
        </div>
      </div>

      {error && <p className="ev-error-msg" role="alert">{error}</p>}

      <div className="ev-grid">
        {activeTab === "my-list" ? (
          // LISTA PRIVADA
          exercises.map((ex) => (
            <div key={ex.id} className="ev-ex-card" onClick={() => setPreviewEx(ex)}>
              <div className="ev-ex-card__actions">
                <button title="Editar" className="ev-ex-card__action-btn" onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}>✏️</button>
                <button title="Excluir" className="ev-ex-card__action-btn ev-ex-card__action-btn--delete" onClick={(e) => { e.stopPropagation(); setDeletingEx(ex); }}>🗑️</button>
              </div>
              <span className={`ex-cat ${CATEGORY_CLASS[ex.category] || ""}`}>{ex.category}</span>
              <div className="ev-ex-card__title">{ex.title}</div>
              <div className="ev-ex-card__desc">{ex.description}</div>
              <div className="ev-ex-card__count">📝 {parseQuestions(ex).length} perguntas</div>
            </div>
          ))
        ) : (
          // LISTA GLOBAL
          globalExercises.map((ex) => (
            <div key={ex.id} className="ev-ex-card ev-ex-card--global" onClick={() => setPreviewEx(ex)}>
              <div className="ev-ex-card__actions">
                <button title="Importar" className="ev-ex-card__action-btn ev-ex-card__action-btn--import" onClick={(e) => { e.stopPropagation(); handleImport(ex); }}>📥</button>
              </div>
              <span className="ex-cat cat-official">OFICIAL</span>
              <div className="ev-ex-card__title">{ex.title}</div>
              <div className="ev-ex-card__desc">{ex.description}</div>
              <div className="ev-ex-card__count">✨ Modelo da Plataforma</div>
            </div>
          ))
        )}

        {(activeTab === "my-list" ? exercises.length : globalExercises.length) === 0 && !loading && (
          <div className="ev-empty">
            <EmptyState icon="📭" message="Nenhum exercício encontrado nesta aba." />
          </div>
        )}
      </div>

      {/* Delete confirmation modal (mantido igual) */}
      {deletingEx && (
        <div className="ev-delete-overlay" onClick={() => setDeletingEx(null)}>
          <div className="ev-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ev-delete-modal__title">Excluir exercício?</div>
            <div className="ev-delete-modal__desc">Tem certeza que deseja excluir <strong>"{deletingEx.title}"</strong>?</div>
            <div className="ev-delete-modal__actions">
              <button className="btn btn-outline" onClick={() => setDeletingEx(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}