import { useState } from "react";
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
  open:        { icon: "📝", color: "#17527c",  label: "Resposta aberta"  },
  scale:       { icon: "🔢", color: "#2e7fab",  label: "Escala 0–10"      },
  reflect:     { icon: "💭", color: "#7a4800",  label: "Reflexão"         },
  instruction: { icon: "📢", color: "#1a5c28",  label: "Instrução"        },
};

export default function CreateExerciseView({
  session,
  onSaved,
  onCancel,
  initialExercise,
}) {
  const isEditing = !!initialExercise;

  const [form, setForm] = useState(() => ({
    title:       isEditing ? initialExercise.title       : "",
    category:    isEditing ? (initialExercise.category || CATEGORIES[0]) : CATEGORIES[0],
    description: isEditing ? initialExercise.description : "",
  }));

  const [questions, setQuestions] = useState(() =>
    isEditing ? parseQuestions(initialExercise) : [makeQuestion()]
  );

  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState("");
  const [error,       setError]       = useState("");
  const [activeQIdx,  setActiveQIdx]  = useState(0);

  const addQ    = () => { setQuestions((qs) => [...qs, makeQuestion()]); setActiveQIdx(questions.length); };
  const removeQ = (i) => { setQuestions((qs) => qs.filter((_, idx) => idx !== i)); setActiveQIdx((p) => Math.max(0, p - 1)); };
  const updateQ = (i, field, val) => setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  const moveQ   = (i, dir) => setQuestions((qs) => {
    const arr = [...qs]; const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

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

  const inputSt = {
    width: "100%", padding: "11px 14px",
    border: "1.5px solid var(--warm)", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
    background: "var(--cream)", color: "var(--text)",
    outline: "none", boxSizing: "border-box",
    transition: "border .2s, box-shadow .2s",
  };

  const activeQ = questions[activeQIdx] ?? null;

  return (
    <div style={{ animation: "fadeUp .4s ease", height: "100%" }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        {onCancel && (
          <button className="btn btn-outline btn-sm" onClick={onCancel}>← Voltar</button>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, letterSpacing: "-.3px" }}>
            {isEditing ? "Editar Exercício" : "Criar Exercício"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {isEditing ? "Modifique as informações abaixo" : "Monte um exercício personalizado para seus pacientes"}
          </p>
        </div>
        <button
          className="btn btn-sage"
          style={{ padding: "11px 28px", fontSize: 14 }}
          onClick={save}
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? "Salvando..." : isEditing ? "💾 Atualizar" : "💾 Publicar exercício"}
        </button>
      </div>

      {success && <div className="success-banner" role="status" style={{ marginBottom: 16 }}>{success}</div>}
      {error   && <p className="error-msg" role="alert" style={{ marginBottom: 16 }}>{error}</p>}

      {isEditing && (
        <div style={{ padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "var(--orange)", border: "1px solid var(--accent)", fontWeight: 500 }}>
          ⚠️ Alterar a ordem ou excluir perguntas de um exercício já respondido pode desalinhar respostas antigas.
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20, alignItems: "start" }}>

        {/* ══ LEFT — Info + Question list ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* General info card */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)", marginBottom: 16 }}>
              Informações gerais
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="ex-title" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Título
              </label>
              <input
                id="ex-title"
                style={inputSt}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Diário das Emoções"
                onFocus={(e) => e.target.style.borderColor = "var(--blue-mid)"}
                onBlur={(e)  => e.target.style.borderColor = "var(--warm)"}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="ex-category" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Categoria
              </label>
              <select
                id="ex-category"
                style={{ ...inputSt, cursor: "pointer" }}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="ex-desc" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Descrição breve
              </label>
              <textarea
                id="ex-desc"
                style={{ ...inputSt, minHeight: 72, resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="O que este exercício trabalha?"
                onFocus={(e) => e.target.style.borderColor = "var(--blue-mid)"}
                onBlur={(e)  => e.target.style.borderColor = "var(--warm)"}
              />
            </div>
          </div>

          {/* Question list */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)" }}>
                Perguntas ({questions.length})
              </div>
              <button
                className="btn btn-sage btn-sm"
                onClick={addQ}
                style={{ fontSize: 12 }}
              >
                + Adicionar
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {questions.map((q, i) => {
                const meta = TYPE_META[q.type] ?? TYPE_META.open;
                const isActive = activeQIdx === i;
                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQIdx(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                      border: `1.5px solid ${isActive ? "var(--blue-dark)" : "var(--warm)"}`,
                      background: isActive ? "rgba(23,82,124,0.06)" : "var(--cream)",
                      transition: "all .15s",
                    }}
                  >
                    {/* Number */}
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                      background: isActive ? "var(--blue-dark)" : "var(--warm)",
                      color: isActive ? "white" : "var(--text-muted)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, transition: "all .15s",
                    }}>
                      {i + 1}
                    </div>

                    {/* Type icon + preview text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                        <span style={{ fontSize: 11 }}>{meta.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: ".05em" }}>
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {q.text || <em>Sem texto ainda...</em>}
                      </div>
                    </div>

                    {/* Move + delete */}
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button
                        aria-label="Mover para cima"
                        onClick={(e) => { e.stopPropagation(); moveQ(i, -1); }}
                        disabled={i === 0}
                        style={{ background: "none", border: "none", cursor: i === 0 ? "not-allowed" : "pointer", opacity: i === 0 ? .3 : .6, fontSize: 13, padding: "2px 3px" }}
                      >↑</button>
                      <button
                        aria-label="Mover para baixo"
                        onClick={(e) => { e.stopPropagation(); moveQ(i, 1); }}
                        disabled={i === questions.length - 1}
                        style={{ background: "none", border: "none", cursor: i === questions.length - 1 ? "not-allowed" : "pointer", opacity: i === questions.length - 1 ? .3 : .6, fontSize: 13, padding: "2px 3px" }}
                      >↓</button>
                      <button
                        aria-label={`Remover pergunta ${i + 1}`}
                        onClick={(e) => { e.stopPropagation(); removeQ(i); }}
                        disabled={questions.length === 1}
                        style={{ background: "none", border: "none", cursor: questions.length === 1 ? "not-allowed" : "pointer", color: "var(--danger)", fontSize: 13, opacity: questions.length === 1 ? .3 : .7, padding: "2px 4px" }}
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Question editor ══ */}
        <div style={{ position: "sticky", top: 20 }}>
          {activeQ ? (
            <div className="card" style={{ animation: "fadeUp .25s ease" }} key={activeQ.id}>

              {/* Editor header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1.5px solid var(--warm)" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--blue-dark)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>
                  {activeQIdx + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    Editando pergunta {activeQIdx + 1}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    {TYPE_META[activeQ.type]?.icon} {TYPE_META[activeQ.type]?.label}
                  </div>
                </div>
              </div>

              {/* Type selector */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 10 }}>
                  Tipo de pergunta
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {QUESTION_TYPES.map((t) => {
                    const meta  = TYPE_META[t.value] ?? TYPE_META.open;
                    const isSel = activeQ.type === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => updateQ(activeQIdx, "type", t.value)}
                        style={{
                          padding: "10px 12px",
                          border: `1.5px solid ${isSel ? "var(--blue-dark)" : "var(--warm)"}`,
                          borderRadius: 10, cursor: "pointer",
                          background: isSel ? "rgba(23,82,124,0.07)" : "var(--cream)",
                          fontFamily: "'DM Sans', sans-serif",
                          display: "flex", alignItems: "center", gap: 8,
                          transition: "all .15s", textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{meta.icon}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? "var(--blue-dark)" : "var(--text)" }}>
                            {meta.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text input */}
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor={`q-text-${activeQ.id}`}
                  style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 8 }}
                >
                  {activeQ.type === "instruction" ? "Texto da instrução" : "Texto da pergunta"}
                </label>
                <textarea
                  id={`q-text-${activeQ.id}`}
                  style={{ ...inputSt, minHeight: 100, resize: "vertical" }}
                  placeholder={
                    activeQ.type === "instruction"
                      ? "Escreva a instrução para o paciente..."
                      : "Escreva a pergunta..."
                  }
                  value={activeQ.text}
                  onChange={(e) => updateQ(activeQIdx, "text", e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = "var(--blue-mid)"}
                  onBlur={(e)  => e.target.style.borderColor = "var(--warm)"}
                />
              </div>

              {/* Type hint */}
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "var(--cream)", border: "1px solid var(--warm)",
                fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55,
              }}>
                {activeQ.type === "open"        && "📝 O paciente escreverá uma resposta livre."}
                {activeQ.type === "scale"       && "🔢 O paciente escolherá um valor de 0 a 10."}
                {activeQ.type === "reflect"     && "💭 Campo opcional — o paciente pode escrever ou apenas refletir."}
                {activeQ.type === "instruction" && "📢 O paciente verá esta mensagem, mas não precisa responder."}
              </div>

              {/* Preview */}
              {activeQ.text && (
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1.5px solid var(--warm)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 10 }}>
                    Pré-visualização
                  </div>

                  {activeQ.type === "instruction" && (
                    <div style={{ background: "linear-gradient(135deg,#17527c,#1e6fa6)", color: "white", borderRadius: 12, padding: "16px 18px", fontSize: 14, lineHeight: 1.7, textAlign: "center" }}>
                      {activeQ.text}
                    </div>
                  )}

                  {activeQ.type === "reflect" && (
                    <div>
                      <div style={{ background: "var(--accent-soft)", borderLeft: "3px solid var(--accent)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "var(--orange)", fontStyle: "italic", marginBottom: 8, lineHeight: 1.6 }}>
                        {activeQ.text}
                      </div>
                      <div style={{ height: 50, border: "1.5px dashed var(--warm)", borderRadius: 10, background: "var(--cream)" }} />
                    </div>
                  )}

                  {activeQ.type === "open" && (
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "var(--text)", marginBottom: 10, lineHeight: 1.5 }}>
                        {activeQ.text}
                      </div>
                      <div style={{ height: 60, border: "1.5px dashed var(--warm)", borderRadius: 10, background: "var(--cream)" }} />
                    </div>
                  )}

                  {activeQ.type === "scale" && (
                    <div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: "var(--text)", marginBottom: 12, lineHeight: 1.5 }}>
                        {activeQ.text}
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                          <div key={n} style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--warm)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                            {n}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "50px 24px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <p style={{ fontSize: 14 }}>Seleciona uma pergunta à esquerda para editá-la.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}