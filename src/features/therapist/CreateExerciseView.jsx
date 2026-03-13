import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { validateExerciseForm } from "../../utils/validation";
import { CATEGORIES, QUESTION_TYPES } from "../../utils/constants";
import "./CreateExerciseView.css";

function makeQuestion() {
  return {
    id:   "q_" + Date.now() + Math.random().toString(36).slice(2, 5),
    type: "open",
    text: "",
  };
}

const TYPE_META = {
  open:        { icon: "📝", label: "Resposta aberta",  color: "var(--blue-dark)"  },
  scale:       { icon: "🔢", label: "Escala Numérica",      color: "var(--blue-mid)"   },
  reflect:     { icon: "💭", label: "Reflexão",         color: "var(--orange)"     },
  instruction: { icon: "📢", label: "Instrução",        color: "var(--sage, #2e7fab)" },
};

const TYPE_HINT = {
  open:        "O paciente escreverá uma resposta livre.",
  scale:       "O paciente escolherá um valor (ex: 0 a 10).",
  reflect:     "Campo opcional — o paciente pode escrever ou apenas refletir.",
  instruction: "O paciente verá esta mensagem, mas não precisa responder.",
};

/* ── QuestionItem ──────────────────────────────────────────── */
function QuestionItem({ q, index, isActive, total, onSelect, onMove, onRemove }) {
  const meta = TYPE_META[q.type] ?? TYPE_META.open;

  return (
    <div
      className={`cev-qitem${isActive ? " cev-qitem--active" : ""}`}
      onClick={() => onSelect(index)}
      role="button"
      tabIndex={0}
      aria-label={`Pergunta ${index + 1}: ${q.text || "sem texto"}`}
      aria-pressed={isActive}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(index); } }}
    >
      <div className={`cev-qitem__num${isActive ? " cev-qitem__num--active" : ""}`}>{index + 1}</div>
      <div className="cev-qitem__body">
        <div className="cev-qitem__type-badge" style={{ "--badge-color": meta.color }}>
          <span aria-hidden="true">{meta.icon}</span>
          <span>{meta.label}</span>
        </div>
        <p className="cev-qitem__preview">{q.text || <em>Sem texto ainda…</em>}</p>
      </div>
      <div className="cev-qitem__controls" onClick={(e) => e.stopPropagation()}>
        <button className="cev-qitem__ctrl" aria-label="Mover para cima" onClick={() => onMove(index, -1)} disabled={index === 0} tabIndex={-1}>↑</button>
        <button className="cev-qitem__ctrl" aria-label="Mover para baixo" onClick={() => onMove(index, 1)} disabled={index === total - 1} tabIndex={-1}>↓</button>
        <button className="cev-qitem__ctrl cev-qitem__ctrl--remove" aria-label={`Remover pergunta ${index + 1}`} onClick={() => onRemove(index)} disabled={total === 1} tabIndex={-1}>🗑</button>
      </div>
    </div>
  );
}

/* ── QuestionEditor ────────────────────────────────────────── */
function QuestionEditor({ q, index, onUpdate }) {
  const meta = TYPE_META[q.type] ?? TYPE_META.open;

  return (
    <div className="cev-editor" key={q.id}>
      <div className="cev-editor__header">
        <div className="cev-editor__num">{index + 1}</div>
        <div>
          <p className="cev-editor__heading">Editando pergunta {index + 1}</p>
          <p className="cev-editor__sub">{meta.icon} {meta.label}</p>
        </div>
      </div>

      <fieldset className="cev-type-fieldset">
        <legend className="cev-label">Tipo de pergunta</legend>
        <div className="cev-type-grid">
          {QUESTION_TYPES.map((t) => {
            const tm   = TYPE_META[t.value] ?? TYPE_META.open;
            const isSel = q.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                className={`cev-type-btn${isSel ? " cev-type-btn--active" : ""}`}
                style={{ "--btn-accent": tm.color }}
                onClick={() => onUpdate(index, "type", t.value)}
                aria-pressed={isSel}
              >
                <span className="cev-type-btn__icon" aria-hidden="true">{tm.icon}</span>
                <span className="cev-type-btn__label">{tm.label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="cev-field">
        <label htmlFor={`q-text-${q.id}`} className="cev-label">{q.type === "instruction" ? "Texto da instrução" : "Texto da pergunta"}</label>
        <textarea
          id={`q-text-${q.id}`}
          className="cev-input cev-input--textarea cev-input--question"
          placeholder={q.type === "instruction" ? "Escreva a instrução para o paciente…" : "Escreva a pergunta…"}
          value={q.text}
          onChange={(e) => onUpdate(index, "text", e.target.value)}
          rows={3}
        />
      </div>

      {/* RECUADROS PARA EDITAR ETIQUETAS DE LA ESCALA */}
      {q.type === "scale" && (
        <div className="cev-field" style={{ marginTop: '15px' }}>
          <label className="cev-label">Rótulos da Escala (Opcional)</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              className="cev-input"
              placeholder="Mínimo (Ex: 0 (Nenhum))"
              value={q.minLabel || ""}
              onChange={(e) => onUpdate(index, "minLabel", e.target.value)}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 'bold' }}>até</span>
            <input
              className="cev-input"
              placeholder="Máximo (Ex: 10 (Máximo))"
              value={q.maxLabel || ""}
              onChange={(e) => onUpdate(index, "maxLabel", e.target.value)}
            />
          </div>
        </div>
      )}

      <p className="cev-type-hint" style={{marginTop: '15px'}}><span aria-hidden="true">{meta.icon}</span> {TYPE_HINT[q.type]}</p>

      {/* Preview */}
      {q.text && (
        <div className="cev-preview">
          <p className="cev-label">Pré-visualização</p>

          {q.type === "instruction" && <div className="cev-preview__instruction">{q.text}</div>}
          {q.type === "reflect" && (<><p className="cev-preview__q-text">{q.text}</p><div className="cev-preview__placeholder" /></>)}
          {q.type === "open" && (<><p className="cev-preview__q-text">{q.text}</p><div className="cev-preview__placeholder cev-preview__placeholder--tall" /></>)}
          
          {q.type === "scale" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              {/* Preview visual de las etiquetas dinámicas que el terapeuta está editando */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 'bold' }}>
                <span style={{color: 'var(--sage, #2d6a4f)'}}>{q.minLabel || '0 (Nenhum)'}</span>
                <span style={{color: 'var(--danger, #e74c3c)'}}>{q.maxLabel || '10 (Máximo)'}</span>
              </div>
              <div className="cev-scale-dots">
                {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <div key={n} className="cev-scale-dots__dot">{n}</div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── CreateExerciseView ────────────────────────────────────── */
export default function CreateExerciseView({ session, onSaved, onCancel, initialExercise }) {
  const isEditing = !!initialExercise;

  const [form, setForm] = useState(() => ({
    title:       isEditing ? initialExercise.title                        : "",
    category:    isEditing ? (initialExercise.category || CATEGORIES[0]) : CATEGORIES[0],
    description: isEditing ? initialExercise.description                 : "",
  }));

  const [questions,  setQuestions]  = useState(() => isEditing ? parseQuestions(initialExercise) : [makeQuestion()]);
  const [saving,     setSaving]     = useState(false);
  const [success,    setSuccess]    = useState("");
  const [error,      setError]      = useState("");
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 768);

  const editorRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const addQ    = () => { setQuestions((qs) => [...qs, makeQuestion()]); setActiveQIdx(questions.length); };
  const removeQ = (i) => { setQuestions((qs) => qs.filter((_, idx) => idx !== i)); setActiveQIdx((p) => Math.max(0, p - 1)); };

  const updateQ = (i, field, val) =>
    setQuestions((qs) => qs.map((q, idx) => {
      if (idx !== i) return q;
      const updatedQ = { ...q, [field]: val };
      
      // AUTO-RELLENADO PARA EL CREADOR DEL TERAPEUTA
      if (field === "type" && val === "scale") {
        updatedQ.minLabel = updatedQ.minLabel || "0 (Nenhum)";
        updatedQ.maxLabel = updatedQ.maxLabel || "10 (Máximo)";
        if (!updatedQ.text || updatedQ.text.trim() === "") {
          updatedQ.text = "De 0 a 10, qual é o seu nível de ansiedade ANTES do exercício?";
        }
      }
      return updatedQ;
    }));

  const moveQ = (i, dir) => setQuestions((qs) => {
    const arr = [...qs]; const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]]; return arr;
  });

  const selectQuestion = (i) => {
    setActiveQIdx(i);
    if (isMobile && editorRef.current) setTimeout(() => { editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
  };

  const save = async () => {
    setError("");
    const err = validateExerciseForm(form, questions);
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      const payload = { title: form.title.trim(), category: form.category, description: form.description.trim(), questions: JSON.stringify(questions) };
      if (isEditing) await db.update("exercises", { id: initialExercise.id }, payload, session.access_token);
      else await db.insert("exercises", { id: "ex_" + Date.now() + Math.random().toString(36).slice(2, 6), therapist_id: session.id, ...payload }, session.access_token);
      setSuccess(isEditing ? "Exercício atualizado!" : "Exercício criado com sucesso!");
      setTimeout(() => { setSuccess(""); onSaved(); }, 1400);
    } catch (e) { setError("Erro ao salvar: " + e.message); } finally { setSaving(false); }
  };

  const activeQ = questions[activeQIdx] ?? null;

  return (
    <div className={`page-fade-in cev-page${isMobile ? " cev-page--mobile" : ""}`}>
      <div className="cev-topbar">
        <div className="cev-topbar__left">
          {onCancel && <button className="cev-back-btn" onClick={onCancel} aria-label="Voltar">← Voltar</button>}
          <div><h2 className="cev-topbar__title">{isEditing ? "Editar Exercício" : "Criar Exercício"}</h2><p className="cev-topbar__sub">{isEditing ? "Modifique as informações abaixo" : "Monte um exercício personalizado para seus pacientes"}</p></div>
        </div>
        {!isMobile && <button className="cev-save-btn" onClick={save} disabled={saving}>{saving ? "Salvando…" : isEditing ? "💾 Atualizar" : "💾 Publicar exercício"}</button>}
      </div>

      {success && <div className="cev-banner cev-banner--success">{success}</div>}
      {error   && <div className="cev-banner cev-banner--error">{error}</div>}
      {isEditing && <div className="cev-banner cev-banner--warn">⚠️ Alterar a ordem ou excluir perguntas pode desalinhar respostas antigas.</div>}

      <div className="cev-layout">
        <div className="cev-left">
          <section className="cev-card">
            <h3 className="cev-card__title">Informações gerais</h3>
            <div className="cev-field">
              <label htmlFor="ex-title" className="cev-label">Título</label>
              <input id="ex-title" className="cev-input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Diário das Emoções" />
            </div>
            <div className="cev-field">
              <label htmlFor="ex-category" className="cev-label">Categoria</label>
              <div className="cev-select-wrap">
                <select id="ex-category" className="cev-input cev-input--select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="cev-field">
              <label htmlFor="ex-desc" className="cev-label">Descrição breve <span className="cev-label__optional">opcional</span></label>
              <textarea id="ex-desc" className="cev-input cev-input--textarea" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="O que este exercício trabalha?" rows={3} />
            </div>
          </section>

          <section className="cev-card">
            <div className="cev-card__header">
              <h3 className="cev-card__title">Perguntas <span className="cev-card__count">{questions.length}</span></h3>
              <button className="cev-add-btn" onClick={addQ}>+ Adicionar</button>
            </div>
            <p className="cev-card__hint">Clique em uma pergunta para editá-la no painel ao lado.</p>
            <div className="cev-qlist">
              {questions.map((q, i) => (
                <div key={q.id}>
                  <QuestionItem q={q} index={i} isActive={activeQIdx === i} total={questions.length} onSelect={selectQuestion} onMove={moveQ} onRemove={removeQ} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div ref={editorRef} className="cev-right">
          {isMobile && <p className="cev-label cev-right__mobile-label">Editor da pergunta selecionada</p>}
          {activeQ ? (
            <section className="cev-card"><QuestionEditor q={activeQ} index={activeQIdx} onUpdate={updateQ} /></section>
          ) : (
            <div className="cev-card cev-editor-empty">
              <span className="cev-editor-empty__icon">👆</span>
              <p className="cev-editor-empty__text">Seleciona uma pergunta para editá-la aqui.</p>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div className="cev-mobile-bar">
          {onCancel && <button className="cev-back-btn" onClick={onCancel}>← Voltar</button>}
          <button className="cev-save-btn cev-save-btn--full" onClick={save} disabled={saving}>{saving ? "Salvando…" : isEditing ? "💾 Atualizar" : "💾 Publicar"}</button>
        </div>
      )}
    </div>
  );
}