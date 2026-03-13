import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import CreateExerciseView from "./CreateExerciseView";
import "./ExercisesView.css";

const TYPE_LABELS = {
  open: "📝 Resposta Aberta",
  options: "🔘 Múltipla Escolha",
  scale: "🔢 Escala Numérica",
  slider: "🎚️ Termômetro (SUDS)",
  rpd: "🧠 RPD (Registro de Pensamentos)",
  cardSort: "🃏 Card Sorting (Valores)",
  matrix: "➕ Matriz ACT",
  instruction: "📢 Instrução"
};

export default function ExercisesView({ session }) {
  const [exercises, setExercises] = useState([]);
  const [globalExercises, setGlobalExercises] = useState([]);
  const [activeTab, setActiveTab] = useState("my-list"); 
  const [editingEx, setEditingEx] = useState(null);
  const [previewEx, setPreviewEx] = useState(null);
  const [deletingEx, setDeletingEx] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = session.access_token;

    const fetchPrivate = db.query("exercises", {}, token).then((r) => {
      const all = Array.isArray(r) ? r : [];
      setExercises(all.filter((ex) => !ex.therapist_id || ex.therapist_id === session.id));
    }).catch(() => {});

    const fetchGlobal = db.query("global_exercises", { order: "created_at.desc" }, token)
      .then((r) => setGlobalExercises(Array.isArray(r) ? r : []))
      .catch(() => setGlobalExercises([]));

    Promise.all([fetchPrivate, fetchGlobal]).finally(() => setLoading(false));
  }, [session.id, session.access_token, refresh]);

  const confirmDelete = async () => {
    if (!deletingEx) return;
    setError("");
    try {
      // 1. Elimina as tarefas pendentes vinculadas a este exercicio (para non deixar pantasmas)
      await db.delete("assignments", { exercise_id: deletingEx.id }, session.access_token).catch(() => {});
      
      // 2. Elimina o exercicio da biblioteca
      await db.delete("exercises", { id: deletingEx.id }, session.access_token);
      
      setRefresh((r) => r + 1);
      setDeletingEx(null);
      if (previewEx?.id === deletingEx.id) setPreviewEx(null);
    } catch (e) {
      setError("Erro ao excluír exercicio: " + e.message);
      setDeletingEx(null);
    }
  };

 const handleImport = async (globalEx) => {
    setError("");
    try {
      await db.insert("exercises", {
        // 👇 ADICIONE ESTA LINHA AQUI 👇
        id: "ex_" + Date.now() + Math.random().toString(36).slice(2, 6),
        title: globalEx.title,
        description: globalEx.description || "Modelo Oficial Equilibre",
        category: globalEx.category || "TCC",
        questions: typeof globalEx.questions === 'string' ? globalEx.questions : JSON.stringify(globalEx.questions),
        therapist_id: session.id
      }, session.access_token);

      alert(`"${globalEx.title}" importado com sucesso!`);
      setActiveTab("my-list");
      setPreviewEx(null);
      setRefresh(r => r + 1);
    } catch (e) {
      setError("Erro ao importar modelo: " + e.message);
    }
  };

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

  if (previewEx) {
    const qs = parseQuestions(previewEx);
    const isGlobal = !exercises.find(e => e.id === previewEx.id);

    return (
      <div className="page-fade-in ev-preview">
        <div className="ev-preview__header">
          <button className="ev-preview__back-btn" onClick={() => setPreviewEx(null)}>
            ← Voltar
          </button>
          <h2 className="ev-preview__heading">Vista Prévia do Exercício</h2>
          {!isGlobal ? (
            <button className="btn btn-sage" onClick={() => setEditingEx(previewEx)}>✏️ Editar Exercício</button>
          ) : (
            <button className="btn btn-sage" style={{background: '#2563eb', borderColor: '#2563eb', color: 'white'}} onClick={() => handleImport(previewEx)}>
              📥 Importar para a Minha Lista
            </button>
          )}
        </div>

        <div className={`ev-preview__card ${isGlobal ? 'ev-preview__card--global' : ''}`}>
          {isGlobal ? (
            <span className="ex-cat cat-official" style={{marginBottom: '10px', display: 'inline-block'}}>OFICIAL EQUILIBRE</span>
          ) : (
            <span className={`ex-cat ${CATEGORY_CLASS[previewEx.category] || ""}`}>{previewEx.category}</span>
          )}
          
          <h3 className="ev-preview__title">{previewEx.title}</h3>
          <p className="ev-preview__desc">{previewEx.description || 'Sem descrição.'}</p>
        </div>

        <h4 className="ev-questions__label">Estrutura do Exercício ({qs.length} blocos)</h4>
        
        {qs.map((q, i) => (
          <div key={q.id || i} className="ev-question-card">
            <div className="ev-question-card__type">
              {i + 1}. {TYPE_LABELS[q.type] || "📝 Bloco"}
            </div>
            <div className="ev-question-card__text">{q.text}</div>
            
            {(q.type === 'options' || q.type === 'cardSort') && q.options && (
               <div className="ev-preview-dynamic-list">
                 {q.options.map((opt, idx) => <span key={idx} className="ev-preview-tag">{opt}</span>)}
               </div>
            )}
            
            {q.type === 'matrix' && q.areas && (
               <div className="ev-preview-dynamic-list">
                 {q.areas.map((area, idx) => <span key={idx} className="ev-preview-tag tag-blue">{area}</span>)}
               </div>
            )}
            
            {(q.type === 'scale' || q.type === 'slider') && (
               <div className="ev-preview-scale-labels">
                 <span className="label-min">{q.minLabel || 'Mínimo'}</span>
                 <span className="scale-line"></span>
                 <span className="label-max">{q.maxLabel || 'Máximo'}</span>
               </div>
            )}
          </div>
        ))}
      </div>
    );
  }

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
          exercises.map((ex) => (
            <div key={ex.id} className="ev-ex-card" onClick={() => setPreviewEx(ex)}>
              <div className="ev-ex-card__actions">
                <button title="Editar" className="ev-ex-card__action-btn" onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}>✏️</button>
                <button title="Excluir" className="ev-ex-card__action-btn ev-ex-card__action-btn--delete" onClick={(e) => { e.stopPropagation(); setDeletingEx(ex); }}>🗑️</button>
              </div>
              <span className={`ex-cat ${CATEGORY_CLASS[ex.category] || ""}`}>{ex.category}</span>
              <div className="ev-ex-card__title">{ex.title}</div>
              <div className="ev-ex-card__desc">{ex.description}</div>
              <div className="ev-ex-card__count">📝 {parseQuestions(ex).length} blocos</div>
            </div>
          ))
        ) : (
          globalExercises.map((ex) => (
            <div key={ex.id} className="ev-ex-card ev-ex-card--global" onClick={() => setPreviewEx(ex)}>
              <div className="ev-ex-card__actions">
                <button title="Importar" className="ev-ex-card__action-btn ev-ex-card__action-btn--import" onClick={(e) => { e.stopPropagation(); handleImport(ex); }}>📥</button>
              </div>
              <span className="ex-cat cat-official">OFICIAL</span>
              <div className="ev-ex-card__title">{ex.title}</div>
              <div className="ev-ex-card__desc">{ex.description || 'Modelo de Intervenção Clínica'}</div>
              <div className="ev-ex-card__count">✨ Pronto a usar</div>
            </div>
          ))
        )}

        {(activeTab === "my-list" ? exercises.length : globalExercises.length) === 0 && !loading && (
          <div className="ev-empty">
            <EmptyState icon="📭" message="Nenhum exercício encontrado nesta aba." />
          </div>
        )}
      </div>

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