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
  open:            { icon: "📝", label: "Resposta aberta",    color: "var(--blue-dark)"     },
  scale:           { icon: "🔢", label: "Escala Numérica",    color: "var(--blue-mid)"      },
  reflect:         { icon: "💭", label: "Reflexão",           color: "var(--orange)"        },
  instruction:     { icon: "📢", label: "Instrução",          color: "var(--sage, #2e7fab)" },
  yes_no:          { icon: "✅", label: "Sim / Não",          color: "#38a169"             },
  multiple_choice: { icon: "🔘", label: "Múltipla escolha",   color: "#805ad5"             },
  checklist:       { icon: "☑️", label: "Checklist",          color: "#2b6cb0"             },
  number:          { icon: "🔢", label: "Número livre",       color: "#d69e2e"             },
  time:            { icon: "⏰", label: "Horário",            color: "#e53e3e"             },
  slider_emoji:    { icon: "😄", label: "Slider emocional",   color: "#e88fb4"             },
  breathing:       { icon: "🌬️", label: "Respiração animada", color: "#4a9c5d"             },
};

const TYPE_HINT = {
  open:            "O paciente escreverá uma resposta livre.",
  scale:           "O paciente escolherá um valor (ex: 0 a 10).",
  reflect:         "Campo opcional — o paciente pode escrever ou apenas refletir.",
  instruction:     "O paciente verá esta mensagem, mas não precisa responder.",
  yes_no:          "O paciente escolherá entre Sim ou Não.",
  multiple_choice: "O paciente escolherá UMA opção entre as que você definir.",
  checklist:       "O paciente poderá marcar VÁRIAS opções entre as que você definir.",
  number:          "O paciente digitará um número (ex: horas de sono, copos de água).",
  time:            "O paciente informará um horário (ex: hora que acordou).",
  slider_emoji:    "O paciente arrasta um slider para indicar como está se sentindo (emoji 1–5).",
  breathing:       "Exibe um anel animado com contagem regressiva para guiar a respiração.",
};

/* ── QuestionItem ─────────────────────────────────────────────── */
function QuestionItem({ q, index, isActive, total, onSelect, onMove, onRemove }) {
  const meta = TYPE_META[q.type] ?? TYPE_META.open;
  return (
    <div
      className={`cev-qitem${isActive ? " cev-qitem--active" : ""}`}
      onClick={() => onSelect(index)}
      role="button" tabIndex={0}
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
        <button className="cev-qitem__ctrl" aria-label="Mover para cima"  onClick={() => onMove(index, -1)} disabled={index === 0}          tabIndex={-1}>↑</button>
        <button className="cev-qitem__ctrl" aria-label="Mover para baixo" onClick={() => onMove(index,  1)} disabled={index === total - 1} tabIndex={-1}>↓</button>
        <button className="cev-qitem__ctrl cev-qitem__ctrl--remove" aria-label={`Remover pergunta ${index + 1}`} onClick={() => onRemove(index)} disabled={total === 1} tabIndex={-1}>🗑</button>
      </div>
    </div>
  );
}

/* ── OptionsEditor — reutilizável para multiple_choice e checklist ── */
function OptionsEditor({ options = [], onChange }) {
  const addOption    = () => onChange([...options, ""]);
  const removeOption = (i) => onChange(options.filter((_, idx) => idx !== i));
  const updateOption = (i, val) => onChange(options.map((o, idx) => idx === i ? val : o));

  return (
    <div className="cev-options-editor">
      {options.map((opt, i) => (
        <div key={i} className="cev-options-editor__row">
          <input
            className="cev-input"
            placeholder={`Opção ${i + 1}`}
            value={opt}
            onChange={(e) => updateOption(i, e.target.value)}
          />
          <button
            type="button"
            className="cev-qitem__ctrl cev-qitem__ctrl--remove"
            onClick={() => removeOption(i)}
            aria-label={`Remover opção ${i + 1}`}
            disabled={options.length === 1}
          >🗑</button>
        </div>
      ))}
      <button type="button" className="cev-add-btn" onClick={addOption} style={{ marginTop: "6px" }}>
        + Adicionar opção
      </button>
    </div>
  );
}

/* ── QuestionEditor ─────────────────────────────────────────────── */
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

      {/* Seletor de tipo */}
      <fieldset className="cev-type-fieldset">
        <legend className="cev-label">Tipo de pergunta</legend>
        <div className="cev-type-grid">
          {QUESTION_TYPES.map((t) => {
            const tm   = TYPE_META[t.value] ?? TYPE_META.open;
            const isSel = q.type === t.value;
            return (
              <button
                key={t.value} type="button"
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

      {/* Texto da pergunta */}
      <div className="cev-field">
        <label htmlFor={`q-text-${q.id}`} className="cev-label">
          {q.type === "instruction" ? "Texto da instrução" : "Texto da pergunta"}
        </label>
        <textarea
          id={`q-text-${q.id}`}
          className="cev-input cev-input--textarea cev-input--question"
          placeholder={
            q.type === "instruction"     ? "Escreva a instrução para o paciente…" :
            q.type === "slider_emoji"    ? "Ex: Como você está se sentindo agora?" :
            q.type === "breathing"       ? "Ex: Siga o ritmo abaixo e respire com calma." :
            q.type === "yes_no"          ? "Ex: Você praticou atividade física hoje?" :
            q.type === "multiple_choice" ? "Ex: Como você se sentiu hoje?" :
            q.type === "checklist"       ? "Ex: Quais sintomas você percebeu hoje?" :
            q.type === "number"          ? "Ex: Quantas horas você dormiu?" :
            q.type === "time"            ? "Ex: A que horas você acordou?" :
            "Escreva a pergunta…"
          }
          value={q.text}
          onChange={(e) => onUpdate(index, "text", e.target.value)}
          rows={3}
        />
      </div>

      {/* Rótulos da escala */}
      {q.type === "scale" && (
        <div className="cev-field" style={{ marginTop: "15px" }}>
          <label className="cev-label">Rótulos da Escala (Opcional)</label>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="cev-input" placeholder="Mínimo (Ex: 0 (Nenhum))" value={q.minLabel || ""} onChange={(e) => onUpdate(index, "minLabel", e.target.value)} />
            <span style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: "bold" }}>até</span>
            <input className="cev-input" placeholder="Máximo (Ex: 10 (Máximo))" value={q.maxLabel || ""} onChange={(e) => onUpdate(index, "maxLabel", e.target.value)} />
          </div>
        </div>
      )}

      {/* Opções — multiple_choice e checklist */}
      {(q.type === "multiple_choice" || q.type === "checklist") && (
        <div className="cev-field" style={{ marginTop: "15px" }}>
          <label className="cev-label">
            {q.type === "checklist" ? "Itens do checklist" : "Opções de escolha"}
          </label>
          <OptionsEditor
            options={q.options ?? ["Opção 1", "Opção 2"]}
            onChange={(opts) => onUpdate(index, "options", opts)}
          />
        </div>
      )}

      {/* Número livre — unidade */}
      {q.type === "number" && (
        <div className="cev-field" style={{ marginTop: "15px" }}>
          <label htmlFor={`q-unit-${q.id}`} className="cev-label">
            Unidade <span className="cev-label__optional">(opcional)</span>
          </label>
          <input
            id={`q-unit-${q.id}`}
            className="cev-input"
            style={{ width: "140px" }}
            placeholder="Ex: horas, copos, km"
            value={q.unit || ""}
            onChange={(e) => onUpdate(index, "unit", e.target.value)}
          />
        </div>
      )}

      {/* Ciclos de respiração */}
      {q.type === "breathing" && (
        <div className="cev-field" style={{ marginTop: "15px" }}>
          <label htmlFor={`q-cycles-${q.id}`} className="cev-label">
            Número de ciclos <span className="cev-label__optional">(padrão: 3)</span>
          </label>
          <input
            id={`q-cycles-${q.id}`}
            type="number" min={1} max={10}
            className="cev-input" style={{ width: "80px" }}
            value={q.cycles ?? 3}
            onChange={(e) => onUpdate(index, "cycles", Number(e.target.value))}
          />
          <p className="cev-type-hint" style={{ marginTop: "6px" }}>Cada ciclo = Inspire 4s – Segure 4s – Expire 6s</p>
        </div>
      )}

      {/* Hint */}
      <p className="cev-type-hint" style={{ marginTop: "15px" }}>
        <span aria-hidden="true">{meta.icon}</span> {TYPE_HINT[q.type] ?? ""}
      </p>

      {/* Pré-visualização */}
      {q.text && (
        <div className="cev-preview">
          <p className="cev-label">Pré-visualização</p>

          {q.type === "instruction" && <div className="cev-preview__instruction">{q.text}</div>}

          {q.type === "reflect" && (
            <><p className="cev-preview__q-text">{q.text}</p><div className="cev-preview__placeholder" /></>
          )}

          {q.type === "open" && (
            <><p className="cev-preview__q-text">{q.text}</p><div className="cev-preview__placeholder cev-preview__placeholder--tall" /></>
          )}

          {q.type === "scale" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", fontWeight: "bold" }}>
                <span style={{ color: "var(--sage, #2d6a4f)" }}>{q.minLabel || "0 (Nenhum)"}</span>
                <span style={{ color: "var(--danger, #e74c3c)" }}>{q.maxLabel || "10 (Máximo)"}</span>
              </div>
              <div className="cev-scale-dots">
                {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <div key={n} className="cev-scale-dots__dot">{n}</div>
                ))}
              </div>
            </>
          )}

          {q.type === "yes_no" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                <div style={{ padding: "10px 28px", borderRadius: "8px", background: "#c6f6d5", color: "#276749", fontWeight: "bold", fontSize: "15px" }}>✅ Sim</div>
                <div style={{ padding: "10px 28px", borderRadius: "8px", background: "#fed7d7", color: "#9b2c2c", fontWeight: "bold", fontSize: "15px" }}>❌ Não</div>
              </div>
            </>
          )}

          {q.type === "multiple_choice" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {(q.options ?? ["Opção 1", "Opção 2"]).map((o, i) => (
                  <div key={i} style={{ padding: "8px 14px", borderRadius: "8px", border: "2px solid var(--border, #e2e8f0)", fontSize: "14px" }}>🔘 {o}</div>
                ))}
              </div>
            </>
          )}

          {q.type === "checklist" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {(q.options ?? ["Item 1", "Item 2"]).map((o, i) => (
                  <div key={i} style={{ padding: "8px 14px", borderRadius: "8px", border: "2px solid var(--border, #e2e8f0)", fontSize: "14px" }}>☐ {o}</div>
                ))}
              </div>
            </>
          )}

          {q.type === "number" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                <div style={{ padding: "10px 18px", borderRadius: "8px", border: "2px solid var(--border, #e2e8f0)", minWidth: "80px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>0</div>
                {q.unit && <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>{q.unit}</span>}
              </div>
            </>
          )}

          {q.type === "time" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ marginTop: "10px", padding: "10px 18px", borderRadius: "8px", border: "2px solid var(--border, #e2e8f0)", display: "inline-block", color: "var(--text-muted)", fontSize: "15px" }}>⏰ 00:00</div>
            </>
          )}

          {q.type === "slider_emoji" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.5rem", margin: "0.5rem 0", padding: "0 0.5rem" }}>
                {["😔", "😞", "😐", "🙂", "😄"].map((e) => (
                  <span key={e} style={{ opacity: 0.5 }}>{e}</span>
                ))}
              </div>
              <div style={{ height: "6px", background: "var(--border, #e2e8f0)", borderRadius: "999px", margin: "0.25rem 0.5rem" }} />
            </>
          )}

          {q.type === "breathing" && (
            <>
              <p className="cev-preview__q-text">{q.text}</p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "1rem" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", border: "6px solid #4a9c5d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🌬️</div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>{q.cycles ?? 3} ciclos · Inspire 4s – Segure 4s – Expire 6s</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── CreateExerciseView ────────────────────────────────────────── */
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
      const u = { ...q, [field]: val };
      if (field === "type") {
        if (val === "scale") {
          u.minLabel = u.minLabel || "0 (Nenhum)";
          u.maxLabel = u.maxLabel || "10 (Máximo)";
          if (!u.text?.trim()) u.text = "De 0 a 10, qual é o seu nível de ansiedade?";
        }
        if (val === "breathing") {
          u.cycles = u.cycles ?? 3;
          if (!u.text?.trim()) u.text = "Siga o ritmo abaixo e respire com calma.";
        }
        if (val === "slider_emoji") {
          if (!u.text?.trim()) u.text = "Como você está se sentindo agora?";
        }
        if (val === "yes_no") {
          if (!u.text?.trim()) u.text = "Você praticou atividade física hoje?";
        }
        if (val === "multiple_choice" || val === "checklist") {
          u.options = u.options?.length ? u.options : ["Opção 1", "Opção 2", "Opção 3"];
          if (!u.text?.trim()) u.text = val === "checklist" ? "Quais sintomas você percebeu hoje?" : "Como você se sentiu hoje?";
        }
        if (val === "number") {
          if (!u.text?.trim()) u.text = "Quantas horas você dormiu?";
          u.unit = u.unit || "horas";
        }
        if (val === "time") {
          if (!u.text?.trim()) u.text = "A que horas você acordou?";
        }
      }
      return u;
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
      const payload = {
        title:       form.title.trim(),
        category:    form.category,
        description: form.description.trim(),
        questions:   JSON.stringify(questions),
      };
      if (isEditing) {
        await db.update("exercises", { id: initialExercise.id }, payload, session.access_token);
      } else {
        await db.insert("exercises", {
          id: "ex_" + Date.now() + Math.random().toString(36).slice(2, 6),
          therapist_id: session.id,
          ...payload,
        }, session.access_token);
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
    <div className={`page-fade-in cev-page${isMobile ? " cev-page--mobile" : ""}`}>
      <div className="cev-topbar">
        <div className="cev-topbar__left">
          {onCancel && <button className="cev-back-btn" onClick={onCancel} aria-label="Voltar">← Voltar</button>}
          <div>
            <h2 className="cev-topbar__title">{isEditing ? "Editar Exercício" : "Criar Exercício"}</h2>
            <p className="cev-topbar__sub">{isEditing ? "Modifique as informações abaixo" : "Monte um exercício personalizado para seus pacientes"}</p>
          </div>
        </div>
        {!isMobile && (
          <button className="cev-save-btn" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : isEditing ? "💾 Atualizar" : "💾 Publicar exercício"}
          </button>
        )}
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
          <button className="cev-save-btn cev-save-btn--full" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : isEditing ? "💾 Atualizar" : "💾 Publicar"}
          </button>
        </div>
      )}
    </div>
  );
}
