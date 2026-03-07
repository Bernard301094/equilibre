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
    const arr = [...qs]; const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  });

  // No mobile, ao selecionar uma pergunta rola suavemente para o editor
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

  const inputSt = {
    width:      "100%",
    padding:    isMobile ? "13px 14px" : "11px 14px",
    minHeight:  isMobile ? 44 : "auto",
    border:     "1.5px solid var(--warm)",
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize:   14,
    background: "var(--cream)",
    color:      "var(--text)",
    outline:    "none",
    boxSizing:  "border-box",
    transition: "border .2s, box-shadow .2s",
  };

  const labelSt = {
    display:       "block",
    fontSize:      11,
    fontWeight:    700,
    color:         "var(--text-muted)",
    marginBottom:  6,
    textTransform: "uppercase",
    letterSpacing: ".06em",
  };

  const fieldSt = { marginBottom: isMobile ? 18 : 14 };

  const activeQ = questions[activeQIdx] ?? null;

  return (
    <div style={{ animation: "fadeUp .4s ease", height: "100%", paddingBottom: isMobile ? 80 : 0 }}>

      {/* ── Top bar ── */}
      <div style={{
        display:       "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems:    isMobile ? "flex-start" : "center",
        gap:           isMobile ? 12 : 14,
        marginBottom:  24,
      }}>
        {/* Linha superior no mobile: botão voltar + título */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
          {onCancel && (
            <button
              className="btn btn-outline btn-sm"
              onClick={onCancel}
              style={{ minHeight: 44, padding: "0 16px", flexShrink: 0 }}
            >
              ← Voltar
            </button>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: isMobile ? 18 : 22, letterSpacing: "-.3px" }}>
              {isEditing ? "Editar Exercício" : "Criar Exercício"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {isEditing ? "Modifique as informações abaixo" : "Monte um exercício personalizado para seus pacientes"}
            </p>
          </div>
        </div>

        {/* Botão salvar: inline no desktop, fixo no rodapé no mobile */}
        {!isMobile && (
          <button
            className="btn btn-sage"
            style={{ padding: "11px 28px", fontSize: 14, minHeight: 44, flexShrink: 0 }}
            onClick={save}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? "Salvando..." : isEditing ? "💾 Atualizar" : "💾 Publicar exercício"}
          </button>
        )}
      </div>

      {success && <div className="success-banner" role="status" style={{ marginBottom: 16 }}>{success}</div>}
      {error   && <p className="error-msg" role="alert" style={{ marginBottom: 16 }}>{error}</p>}

      {isEditing && (
        <div style={{ padding: "10px 14px", background: "var(--accent-soft)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "var(--orange)", border: "1px solid var(--accent)", fontWeight: 500 }}>
          ⚠️ Alterar a ordem ou excluir perguntas de um exercício já respondido pode desalinhar respostas antigas.
        </div>
      )}

      {/* ── Layout: duas colunas no desktop, coluna única no mobile ── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr",
        gap:                 isMobile ? 16 : 20,
        alignItems:          "start",
      }}>

        {/* ══ ESQUERDA — Info geral + lista de perguntas ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Card de informações gerais */}
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)", marginBottom: 16 }}>
              Informações gerais
            </div>

            <div style={fieldSt}>
              <label htmlFor="ex-title" style={labelSt}>Título</label>
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

            <div style={fieldSt}>
              <label htmlFor="ex-category" style={labelSt}>Categoria</label>
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
              <label htmlFor="ex-desc" style={labelSt}>Descrição breve</label>
              <textarea
                id="ex-desc"
                style={{ ...inputSt, minHeight: isMobile ? 80 : 72, resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="O que este exercício trabalha?"
                onFocus={(e) => e.target.style.borderColor = "var(--blue-mid)"}
                onBlur={(e)  => e.target.style.borderColor = "var(--warm)"}
              />
            </div>
          </div>

          {/* Lista de perguntas */}
          <div className="card" style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)" }}>
                Perguntas ({questions.length})
              </div>
              <button
                className="btn btn-sage btn-sm"
                onClick={addQ}
                style={{ fontSize: 12, minHeight: 44, padding: "0 16px" }}
              >
                + Adicionar
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions.map((q, i) => {
                const meta     = TYPE_META[q.type] ?? TYPE_META.open;
                const isActive = activeQIdx === i;
                return (
                  <div
                    key={q.id}
                    onClick={() => selectQuestion(i)}
                    style={{
                      display:    "flex",
                      alignItems: "center",
                      gap:        10,
                      padding:    isMobile ? "13px 12px" : "10px 12px",
                      minHeight:  isMobile ? 56 : "auto",
                      borderRadius: 10,
                      cursor:     "pointer",
                      border:     `1.5px solid ${isActive ? "var(--blue-dark)" : "var(--warm)"}`,
                      background: isActive ? "rgba(23,82,124,0.06)" : "var(--cream)",
                      transition: "all .15s",
                    }}
                  >
                    {/* Número */}
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: isActive ? "var(--blue-dark)" : "var(--warm)",
                      color:      isActive ? "white" : "var(--text-muted)",
                      display:    "flex", alignItems: "center", justifyContent: "center",
                      fontSize:   11, fontWeight: 700, transition: "all .15s",
                    }}>
                      {i + 1}
                    </div>

                    {/* Tipo + preview */}
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

                    {/* Mover + remover — botões maiores no mobile */}
                    <div style={{ display: "flex", gap: isMobile ? 6 : 2, flexShrink: 0 }}>
                      <button
                        aria-label="Mover para cima"
                        onClick={(e) => { e.stopPropagation(); moveQ(i, -1); }}
                        disabled={i === 0}
                        style={{
                          background: "none", border: "none",
                          cursor:     i === 0 ? "not-allowed" : "pointer",
                          opacity:    i === 0 ? .3 : .6,
                          fontSize:   isMobile ? 16 : 13,
                          padding:    isMobile ? "6px 8px" : "2px 3px",
                          minWidth:   isMobile ? 36 : "auto",
                          minHeight:  isMobile ? 36 : "auto",
                        }}
                      >↑</button>
                      <button
                        aria-label="Mover para baixo"
                        onClick={(e) => { e.stopPropagation(); moveQ(i, 1); }}
                        disabled={i === questions.length - 1}
                        style={{
                          background: "none", border: "none",
                          cursor:     i === questions.length - 1 ? "not-allowed" : "pointer",
                          opacity:    i === questions.length - 1 ? .3 : .6,
                          fontSize:   isMobile ? 16 : 13,
                          padding:    isMobile ? "6px 8px" : "2px 3px",
                          minWidth:   isMobile ? 36 : "auto",
                          minHeight:  isMobile ? 36 : "auto",
                        }}
                      >↓</button>
                      <button
                        aria-label={`Remover pergunta ${i + 1}`}
                        onClick={(e) => { e.stopPropagation(); removeQ(i); }}
                        disabled={questions.length === 1}
                        style={{
                          background: "none", border: "none",
                          cursor:     questions.length === 1 ? "not-allowed" : "pointer",
                          color:      "var(--danger)",
                          fontSize:   isMobile ? 16 : 13,
                          opacity:    questions.length === 1 ? .3 : .7,
                          padding:    isMobile ? "6px 8px" : "2px 4px",
                          minWidth:   isMobile ? 36 : "auto",
                          minHeight:  isMobile ? 36 : "auto",
                        }}
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ DIREITA — Editor da pergunta ══ */}
        <div
          ref={editorRef}
          style={{ position: isMobile ? "static" : "sticky", top: 20 }}
        >
          {/* Título de seção visível apenas no mobile */}
          {isMobile && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)", marginBottom: 10 }}>
              Editor da pergunta selecionada
            </div>
          )}

          {activeQ ? (
            <div className="card" style={{ animation: "fadeUp .25s ease" }} key={activeQ.id}>

              {/* Cabeçalho do editor */}
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

              {/* Seletor de tipo */}
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
                          padding:    isMobile ? "13px 12px" : "10px 12px",
                          minHeight:  44,
                          border:     `1.5px solid ${isSel ? "var(--blue-dark)" : "var(--warm)"}`,
                          borderRadius: 10,
                          cursor:     "pointer",
                          background: isSel ? "rgba(23,82,124,0.07)" : "var(--cream)",
                          fontFamily: "'DM Sans', sans-serif",
                          display:    "flex",
                          alignItems: "center",
                          gap:        8,
                          transition: "all .15s",
                          textAlign:  "left",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{meta.icon}</span>
                        <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: isSel ? "var(--blue-dark)" : "var(--text)" }}>
                          {meta.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Campo de texto */}
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor={`q-text-${activeQ.id}`}
                  style={{ ...labelSt, marginBottom: 8 }}
                >
                  {activeQ.type === "instruction" ? "Texto da instrução" : "Texto da pergunta"}
                </label>
                <textarea
                  id={`q-text-${activeQ.id}`}
                  style={{ ...inputSt, minHeight: isMobile ? 110 : 100, resize: "vertical" }}
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

              {/* Dica do tipo */}
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

              {/* Pré-visualização */}
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
              <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
              <p style={{ fontSize: 14 }}>Seleciona uma pergunta acima para editá-la.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Barra de ação fixa no rodapé — apenas mobile ── */}
      {isMobile && (
        <div style={{
          position:   "fixed",
          bottom:     64,           /* acima do BottomNav */
          left:       0,
          right:      0,
          zIndex:     90,
          background: "var(--white)",
          borderTop:  "1px solid var(--warm)",
          padding:    "12px 16px",
          display:    "flex",
          gap:        10,
          boxShadow:  "0 -4px 20px rgba(15,30,42,0.10)",
        }}>
          {onCancel && (
            <button
              className="btn btn-outline"
              onClick={onCancel}
              style={{ flex: 1, minHeight: 48, fontSize: 14 }}
            >
              ← Voltar
            </button>
          )}
          <button
            className="btn btn-sage"
            onClick={save}
            disabled={saving}
            aria-busy={saving}
            style={{ flex: 2, minHeight: 48, fontSize: 14, fontWeight: 700 }}
          >
            {saving ? "Salvando..." : isEditing ? "💾 Atualizar" : "💾 Publicar"}
          </button>
        </div>
      )}
    </div>
  );
}