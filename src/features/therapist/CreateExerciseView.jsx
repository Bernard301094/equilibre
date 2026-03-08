import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { validateExerciseForm } from "../../utils/validation";
import { CATEGORIES, QUESTION_TYPES, CATEGORY_CLASS } from "../../utils/constants";

function makeQuestion() {
  return {
    id:   "q_" + Date.now() + Math.random().toString(36).slice(2, 5),
    type: "open",
    text: "",
  };
}

const TYPE_META = {
  open:        { icon: "📝", color: "#17527c", label: "Resposta aberta" },
  scale:       { icon: "🔢", color: "#2e7fab", label: "Escala 0–10"     },
  reflect:     { icon: "💭", color: "#7a4800", label: "Reflexão"        },
  instruction: { icon: "📢", color: "#1a5c28", label: "Instrução"       },
};

const TYPE_HINT = {
  open:        "📝 O paciente escreverá uma resposta livre.",
  scale:       "🔢 O paciente escolherá um valor de 0 a 10.",
  reflect:     "💭 Campo opcional — o paciente pode escrever ou apenas refletir.",
  instruction: "📢 O paciente verá esta mensagem, mas não precisa responder.",
};

export default function CreateExerciseView({ session, onSaved, onCancel, initialExercise }) {
  const isEditing = !!initialExercise;

  const [form, setForm] = useState(() => ({
    title:       isEditing ? initialExercise.title                          : "",
    category:    isEditing ? (initialExercise.category || CATEGORIES[0])   : CATEGORIES[0],
    description: isEditing ? initialExercise.description                   : "",
  }));

  const [questions,   setQuestions]   = useState(() =>
    isEditing ? parseQuestions(initialExercise) : [makeQuestion()]
  );
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");
  const [activeQIdx,  setActiveQIdx]  = useState(0);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

  const editorRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const addQ    = () => { setQuestions((qs) => [...qs, makeQuestion()]); setActiveQIdx(questions.length); };
  const removeQ = (i) => { setQuestions((qs) => qs.filter((_, idx) => idx !== i)); setActiveQIdx((p) => Math.max(0, p - 1)); };
  const updateQ = (i, field, val) => setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  const moveQ   = (i, dir) => setQuestions((qs) => {
    const arr = [...qs];
    const j   = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

  const selectQuestion = (i) => {
    setActiveQIdx(i);
    if (isMobile && editorRef.current) {
      setTimeout(() => {
        editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  const save = async () => {
    setError("");
    const err = validateExerciseForm(form, questions);
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      const payload = {
        title:       form.title.trim(),
        category:    form.category,
        description: form.description.trim(),
        questions:   JSON.stringify(questions),
      };
      if (isEditing) {
        await db.update("exercises", { id: initialExercise.id }, payload, session.access_token);
      } else {
        await db.insert("exercises", { id: "ex_" + Date.now(), therapist_id: session.id, ...payload }, session.access_token);
      }
      setSuccess(isEditing ? "Exercício atualizado!" : "Exercício criado com sucesso!");
      setTimeout(() => { setSuccess(""); onSaved(); }, 1400);
    } catch (e) {
      setError("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const activeQ = questions[activeQIdx] ?? null;

  return (
    <div className={`page-fade-in cev-wrapper${isMobile ? " cev-wrapper--mobile" : ""}`}>

      {/* ── Top bar ── */}
      <div className="cev-topbar">
        <div className="cev-topbar-row">
          {onCancel && (
            <button className="btn btn-outline btn-sm cev-back-btn" onClick={onCancel}>
              ← Voltar
            </button>
          )}
          <div className="cev-topbar-text">
            <h2 className="cev-title">
              {isEditing ? "Editar Exercício" : "Criar Exercício"}
            </h2>
            <p className="cev-subtitle">
              {isEditing
                ? "Modifique as informações abaixo"
                : "Monte um exercício personalizado para seus pacientes"}
            </p>
          </div>
        </div>

        {/* Desktop inline save button */}
        {!isMobile && (
          <button
            className="btn btn-sage cev-save-btn"
            onClick={save}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Salvando..." : isEditing ? "💾 Atualizar" : "💾 Publicar exercício"}
          </button>
        )}
      </div>

      {success && <div className="success-banner cev-alert" role="status">{success}</div>}
      {error   && <p className="error-msg cev-alert" role="alert">{error}</p>}

      {isEditing && (
        <div className="cev-warning" role="note">
          ⚠️ Alterar a ordem ou excluir perguntas de um exercício já respondido pode desalinhar respostas antigas.
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="cev-layout">

        {/* ══ LEFT — general info + question list ══ */}
        <div className="cev-left">

          {/* General info card */}
          <div className="card">
            <div className="cev-section-label">Informações gerais</div>

            <div className="cev-field">
              <label htmlFor="ex-title" className="cev-label">Título</label>
              <input
                id="ex-title"
                className="cev-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Diário das Emoções"
              />
            </div>

            <div className="cev-field">
              <label htmlFor="ex-category" className="cev-label">Categoria</label>
              <select
                id="ex-category"
                className="cev-input cev-select"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="cev-field cev-field--last">
              <label htmlFor="ex-desc" className="cev-label">Descrição breve</label>
              <textarea
                id="ex-desc"
                className="cev-input cev-textarea"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="O que este exercício trabalha?"
              />
            </div>
          </div>

          {/* Questions list card */}
          <div className="card cev-q-card">
            <div className="cev-q-list-header">
              <div className="cev-section-label">
                Perguntas ({questions.length})
              </div>
              <button className="btn btn-sage btn-sm cev-add-btn" onClick={addQ}>
                + Adicionar
              </button>
            </div>

            <div className="cev-q-list">
              {questions.map((q, i) => {
                const meta     = TYPE_META[q.type] ?? TYPE_META.open;
                const isActive = activeQIdx === i;
                return (
                  <div
                    key={q.id}
                    onClick={() => selectQuestion(i)}
                    className={`cev-q-item${isActive ? " cev-q-item--active" : ""}`}
                  >
                    {/* Number bubble */}
                    <div className={`cev-q-num${isActive ? " cev-q-num--active" : ""}`}>
                      {i + 1}
                    </div>

                    {/* Type + preview text */}
                    <div className="cev-q-body">
                      <div className="cev-q-type-row">
                        <span className="cev-q-type-icon" aria-hidden="true">{meta.icon}</span>
                        <span
                          className="cev-q-type-label"
                          data-type={q.type}
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="cev-q-preview-text">
                        {q.text || <em>Sem texto ainda...</em>}
                      </div>
                    </div>

                    {/* Move / remove controls */}
                    <div className="cev-q-controls">
                      <button
                        aria-label="Mover para cima"
                        className="cev-q-btn"
                        onClick={(e) => { e.stopPropagation(); moveQ(i, -1); }}
                        disabled={i === 0}
                      >↑</button>
                      <button
                        aria-label="Mover para baixo"
                        className="cev-q-btn"
                        onClick={(e) => { e.stopPropagation(); moveQ(i, 1); }}
                        disabled={i === questions.length - 1}
                      >↓</button>
                      <button
                        aria-label={`Remover pergunta ${i + 1}`}
                        className="cev-q-btn cev-q-btn--remove"
                        onClick={(e) => { e.stopPropagation(); removeQ(i); }}
                        disabled={questions.length === 1}
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ RIGHT — question editor ══ */}
        <div ref={editorRef} className="cev-right">

          {isMobile && (
            <div className="cev-section-label cev-editor-mobile-label">
              Editor da pergunta selecionada
            </div>
          )}

          {activeQ ? (
            <div className="card cev-editor-card" key={activeQ.id}>

              {/* Editor header */}
              <div className="cev-editor-header">
                <div className="cev-editor-num">{activeQIdx + 1}</div>
                <div>
                  <div className="cev-editor-heading">
                    Editando pergunta {activeQIdx + 1}
                  </div>
                  <div className="cev-editor-subheading">
                    {TYPE_META[activeQ.type]?.icon} {TYPE_META[activeQ.type]?.label}
                  </div>
                </div>
              </div>

              {/* Type selector */}
              <div className="cev-type-section">
                <div className="cev-section-label">Tipo de pergunta</div>
                <div className="cev-type-grid">
                  {QUESTION_TYPES.map((t) => {
                    const meta  = TYPE_META[t.value] ?? TYPE_META.open;
                    const isSel = activeQ.type === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => updateQ(activeQIdx, "type", t.value)}
                        className={`cev-type-btn${isSel ? " cev-type-btn--active" : ""}`}
                      >
                        <span className="cev-type-btn-icon" aria-hidden="true">
                          {meta.icon}
                        </span>
                        <span className={`cev-type-btn-label${isSel ? " cev-type-btn-label--active" : ""}`}>
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text / instruction textarea */}
              <div className="cev-field">
                <label htmlFor={`q-text-${activeQ.id}`} className="cev-label">
                  {activeQ.type === "instruction" ? "Texto da instrução" : "Texto da pergunta"}
                </label>
                <textarea
                  id={`q-text-${activeQ.id}`}
                  className="cev-input cev-textarea cev-textarea--question"
                  placeholder={
                    activeQ.type === "instruction"
                      ? "Escreva a instrução para o paciente..."
                      : "Escreva a pergunta..."
                  }
                  value={activeQ.text}
                  onChange={(e) => updateQ(activeQIdx, "text", e.target.value)}
                />
              </div>

              {/* Type hint */}
              <div className="cev-type-hint">
                {TYPE_HINT[activeQ.type]}
              </div>

              {/* Preview */}
              {activeQ.text && (
                <div className="cev-preview">
                  <div className="cev-section-label">Pré-visualização</div>

                  {activeQ.type === "instruction" && (
                    <div className="cev-preview-instruction">{activeQ.text}</div>
                  )}

                  {activeQ.type === "reflect" && (
                    <div>
                      <div className="cev-preview-reflect">{activeQ.text}</div>
                      <div className="cev-preview-placeholder" />
                    </div>
                  )}

                  {activeQ.type === "open" && (
                    <div>
                      <div className="cev-preview-q-text">{activeQ.text}</div>
                      <div className="cev-preview-placeholder cev-preview-placeholder--tall" />
                    </div>
                  )}

                  {activeQ.type === "scale" && (
                    <div>
                      <div className="cev-preview-q-text">{activeQ.text}</div>
                      <div className="cev-scale-dots">
                        {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                          <div key={n} className="cev-scale-dot">{n}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card cev-empty-editor">
              <div className="cev-empty-icon" aria-hidden="true">👆</div>
              <p className="cev-empty-text">Seleciona uma pergunta acima para editá-la.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile fixed save bar ── */}
      {isMobile && (
        <div className="cev-mobile-bar">
          {onCancel && (
            <button className="btn btn-outline cev-mobile-bar-back" onClick={onCancel}>
              ← Voltar
            </button>
          )}
          <button
            className="btn btn-sage cev-mobile-bar-save"
            onClick={save}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Salvando..." : isEditing ? "💾 Atualizar" : "💾 Publicar"}
          </button>
        </div>
      )}
    </div>
  );
}