// src/features/therapist/ExercisesView.jsx
import { useState, useEffect } from "react";
import db from "../../services/db";
import { CLINICAL_MODELS } from "../../utils/clinicalModels";
import { parseQuestions } from "../../utils/parsing";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import CreateExerciseView from "./CreateExerciseView";
import "./ExercisesView.css";

const TYPE_LABELS = {
  open:        "📝 Resposta Aberta",
  options:     "🔘 Múltipla Escolha",
  scale:       "🔢 Escala Numérica",
  slider:      "🎚️ Termômetro (SUDS)",
  rpd:         "🧠 RPD (Registro de Pensamentos)",
  cardSort:    "🃏 Card Sorting (Valores)",
  matrix:      "➕ Matriz ACT",
  instruction: "📢 Instrução",
  reflect:     "💭 Reflexão",
};

const APPROACH_COLORS = {
  "TCC":                 { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  "ACT":                 { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  "DBT":                 { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
  "BA":                  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
  "THS":                 { bg: "#fefce8", border: "#fde68a", text: "#b45309" },
  "Psicologia Positiva": { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" },
};

const ALL_APPROACHES = ["Todos", "TCC", "ACT", "DBT", "BA", "THS", "Psicologia Positiva"];

export default function ExercisesView({ session }) {
  const [exercises,      setExercises]      = useState([]);
  const [activeTab,      setActiveTab]      = useState("my-list");
  const [approachFilter, setApproachFilter] = useState("Todos");
  const [editingEx,      setEditingEx]      = useState(null);
  const [previewEx,      setPreviewEx]      = useState(null);
  const [deletingEx,     setDeletingEx]     = useState(null);
  const [refresh,        setRefresh]        = useState(0);
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [importing,      setImporting]      = useState(null);

  useEffect(() => {
    setLoading(true);
    db.query("exercises", {}, session.access_token)
      .then((r) => {
        const all = Array.isArray(r) ? r : [];
        setExercises(all.filter((ex) => !ex.therapist_id || ex.therapist_id === session.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session.id, session.access_token, refresh]);

  const confirmDelete = async () => {
    if (!deletingEx) return;
    setError("");
    try {
      await db.delete("assignments", { exercise_id: deletingEx.id }, session.access_token).catch(() => {});
      await db.delete("exercises",   { id: deletingEx.id },          session.access_token);
      setRefresh((r) => r + 1);
      setDeletingEx(null);
      if (previewEx?.id === deletingEx.id) setPreviewEx(null);
    } catch (e) {
      setError("Erro ao excluír exercicio: " + e.message);
      setDeletingEx(null);
    }
  };

  const handleImport = async (model) => {
    setError("");
    setImporting(model.title);
    try {
      await db.insert("exercises", {
        id:           "ex_" + Date.now() + Math.random().toString(36).slice(2, 6),
        title:        model.title,
        description:  model.description || "Modelo Oficial Equilibre",
        category:     model.category || "TCC",
        questions:    JSON.stringify(model.questions),
        therapist_id: session.id,
      }, session.access_token);
      setRefresh((r) => r + 1);
    } catch (e) {
      setError("Erro ao importar modelo: " + e.message);
    } finally {
      setImporting(null);
    }
  };

  // Títulos já importados para mostrar badge ✅
  const importedTitles = new Set(exercises.map((e) => e.title));

  // Modelos filtrados por abordagem
  const filteredModels = approachFilter === "Todos"
    ? CLINICAL_MODELS
    : CLINICAL_MODELS.filter((m) => m.category === approachFilter);

  if (editingEx) {
    return (
      <CreateExerciseView
        key={editingEx.id}
        session={session}
        initialExercise={editingEx}
        onSaved={() => { setEditingEx(null); setPreviewEx(null); setRefresh((r) => r + 1); }}
        onCancel={() => setEditingEx(null)}
      />
    );
  }

  if (previewEx) {
    const qs       = parseQuestions(previewEx);
    const isModel  = !!previewEx._isModel; // flag para saber se veio do CLINICAL_MODELS
    const colors   = APPROACH_COLORS[previewEx.category] || {};
    const alreadyImported = importedTitles.has(previewEx.title);

    return (
      <div className="page-fade-in ev-preview">
        <div className="ev-preview__header">
          <button className="ev-preview__back-btn" onClick={() => setPreviewEx(null)}>← Voltar</button>
          <h2 className="ev-preview__heading">Vista Prévia do Exercício</h2>
          {!isModel ? (
            <button className="btn btn-sage" onClick={() => setEditingEx(previewEx)}>✏️ Editar Exercício</button>
          ) : alreadyImported ? (
            <span style={{ padding: "8px 16px", background: "#dcfce7", color: "#16a34a", borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
              ✅ Já na sua biblioteca
            </span>
          ) : (
            <button
              className="btn btn-sage"
              style={{ background: "#2563eb", borderColor: "#2563eb", color: "white" }}
              disabled={importing === previewEx.title}
              onClick={() => handleImport(previewEx)}
            >
              {importing === previewEx.title ? "⏳ Adicionando..." : "📥 Adicionar à Minha Lista"}
            </button>
          )}
        </div>

        <div className={`ev-preview__card ${isModel ? "ev-preview__card--global" : ""}`}>
          {isModel ? (
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="ex-cat cat-official">EQUILIBRE</span>
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text,
              }}>
                {previewEx.category}
              </span>
            </div>
          ) : (
            <span className={`ex-cat ${CATEGORY_CLASS[previewEx.category] || ""}`}>{previewEx.category}</span>
          )}
          <h3 className="ev-preview__title">{previewEx.title}</h3>
          <p className="ev-preview__desc">{previewEx.description || "Sem descrição."}</p>
        </div>

        <h4 className="ev-questions__label">Estrutura do Exercício ({qs.length} blocos)</h4>

        {qs.map((q, i) => (
          <div key={q.id || i} className="ev-question-card">
            <div className="ev-question-card__type">{i + 1}. {TYPE_LABELS[q.type] || "📝 Bloco"}</div>
            <div className="ev-question-card__text">{q.text}</div>
            {(q.type === "options" || q.type === "cardSort") && q.options && (
              <div className="ev-preview-dynamic-list">
                {q.options.map((opt, idx) => <span key={idx} className="ev-preview-tag">{opt}</span>)}
              </div>
            )}
            {q.type === "matrix" && q.areas && (
              <div className="ev-preview-dynamic-list">
                {q.areas.map((area, idx) => <span key={idx} className="ev-preview-tag tag-blue">{area}</span>)}
              </div>
            )}
            {(q.type === "scale" || q.type === "slider") && (
              <div className="ev-preview-scale-labels">
                <span className="label-min">{q.minLabel || "Mínimo"}</span>
                <span className="scale-line"></span>
                <span className="label-max">{q.maxLabel || "Máximo"}</span>
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
            className={`ev-tab-btn ${activeTab === "my-list" ? "active" : ""}`}
            onClick={() => setActiveTab("my-list")}
          >
            👤 Meus Criados ({exercises.length})
          </button>
          <button
            className={`ev-tab-btn ${activeTab === "library" ? "active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            ✨ Modelos Equilibre ({CLINICAL_MODELS.length})
          </button>
        </div>
      </div>

      {error && <p className="ev-error-msg" role="alert">{error}</p>}

      {/* Filtro por abordagem — só na aba Modelos */}
      {activeTab === "library" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {ALL_APPROACHES.map((approach) => {
            const colors   = APPROACH_COLORS[approach] || {};
            const isActive = approachFilter === approach;
            const count    = approach === "Todos"
              ? CLINICAL_MODELS.length
              : CLINICAL_MODELS.filter((m) => m.category === approach).length;
            return (
              <button
                key={approach}
                onClick={() => setApproachFilter(approach)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: "pointer",
                  border:      isActive ? `2px solid ${colors.border || "#0a2e48"}` : "2px solid #e8d5b7",
                  background:  isActive ? (colors.bg   || "#0a2e48") : "white",
                  color:       isActive ? (colors.text || "white")   : "#6b7280",
                  transition: "all 0.15s",
                }}
              >
                {approach} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}

      <div className="ev-grid">
        {activeTab === "my-list" ? (
          exercises.length === 0 && !loading ? (
            <div className="ev-empty">
              <EmptyState icon="📭" message="Você ainda não criou nenhum exercício." />
            </div>
          ) : (
            exercises.map((ex) => (
              <div key={ex.id} className="ev-ex-card" onClick={() => setPreviewEx(ex)}>
                <div className="ev-ex-card__actions">
                  <button title="Editar"  className="ev-ex-card__action-btn" onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}>✏️</button>
                  <button title="Excluir" className="ev-ex-card__action-btn ev-ex-card__action-btn--delete" onClick={(e) => { e.stopPropagation(); setDeletingEx(ex); }}>🗑️</button>
                </div>
                <span className={`ex-cat ${CATEGORY_CLASS[ex.category] || ""}`}>{ex.category}</span>
                <div className="ev-ex-card__title">{ex.title}</div>
                <div className="ev-ex-card__desc">{ex.description}</div>
                <div className="ev-ex-card__count">📝 {parseQuestions(ex).length} blocos</div>
              </div>
            ))
          )
        ) : (
          filteredModels.length === 0 ? (
            <div className="ev-empty">
              <EmptyState icon="📭" message={`Nenhum modelo de ${approachFilter} disponível.`} />
            </div>
          ) : (
            filteredModels.map((model) => {
              const colors          = APPROACH_COLORS[model.category] || {};
              const alreadyImported = importedTitles.has(model.title);
              return (
                <div
                  key={model.title}
                  className="ev-ex-card ev-ex-card--global"
                  onClick={() => setPreviewEx({ ...model, _isModel: true })}
                  style={alreadyImported ? { opacity: 0.7 } : {}}
                >
                  <div className="ev-ex-card__actions">
                    {alreadyImported ? (
                      <span title="Já adicionado" style={{
                        padding: "4px 8px", background: "#dcfce7", color: "#16a34a",
                        borderRadius: 6, fontSize: 11, fontWeight: 700,
                      }}>✅</span>
                    ) : (
                      <button
                        title="Adicionar à minha lista"
                        className="ev-ex-card__action-btn ev-ex-card__action-btn--import"
                        disabled={importing === model.title}
                        onClick={(e) => { e.stopPropagation(); handleImport(model); }}
                      >
                        {importing === model.title ? "⏳" : "📥"}
                      </button>
                    )}
                  </div>

                  <span style={{
                    display: "inline-block", marginBottom: 8,
                    padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800,
                    background: colors.bg    || "#f1f5f9",
                    border:     `1px solid ${colors.border || "#e2e8f0"}`,
                    color:      colors.text  || "#475569",
                  }}>
                    {model.category}
                  </span>

                  <div className="ev-ex-card__title">{model.title}</div>
                  <div className="ev-ex-card__desc">{model.description}</div>
                  <div className="ev-ex-card__count">✨ {model.questions.length} blocos</div>
                </div>
              );
            })
          )
        )}
      </div>

      {deletingEx && (
        <div className="ev-delete-overlay" onClick={() => setDeletingEx(null)}>
          <div className="ev-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ev-delete-modal__title">Excluir exercício?</div>
            <div className="ev-delete-modal__desc">
              Tem certeza que deseja excluir <strong>"{deletingEx.title}"</strong>?
            </div>
            <div className="ev-delete-modal__actions">
              <button className="btn btn-outline" onClick={() => setDeletingEx(null)}>Cancelar</button>
              <button className="btn-danger"      onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
