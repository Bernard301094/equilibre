import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { CATEGORY_CLASS } from "../../utils/constants";
import EmptyState from "../../components/ui/EmptyState";
import CreateExerciseView from "./CreateExerciseView";

export default function ExercisesView({ session }) {
  const [exercises, setExercises] = useState([]);
  const [editingEx, setEditingEx] = useState(null);
  const [previewEx, setPreviewEx] = useState(null);
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
      <div style={{ animation: "fadeUp .3s ease", maxWidth: 720 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 24 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPreviewEx(null)}>
            ← Voltar
          </button>
          <h2 style={{ flex: 1, fontSize: 22 }}>Vista Prévia</h2>
          <button className="btn btn-sage" onClick={() => setEditingEx(previewEx)}>
            ✏️ Editar Exercício
          </button>
        </div>

        <div className="card" style={{ marginBottom: 20, borderTop: "4px solid var(--sage-dark)" }}>
          <span className={`ex-cat ${CATEGORY_CLASS[previewEx.category] || ""}`} style={{ marginBottom: 12 }}>
            {previewEx.category}
          </span>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, color: "var(--blue-dark)", marginBottom: 8 }}>
            {previewEx.title}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
            {previewEx.description}
          </p>
        </div>

        <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)", marginBottom: 12 }}>
          Perguntas cadastradas ({qs.length})
        </h4>

        {qs.map((q, i) => (
          <div key={q.id || i} className="card" style={{ marginBottom: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
              {i + 1}.{" "}
              {q.type === "instruction" ? "📢 Instrução"
               : q.type === "scale"     ? "🔢 Escala de 0 a 10"
               : q.type === "reflect"   ? "💭 Reflexão"
               : "📝 Resposta Aberta"}
            </div>
            <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.5 }}>{q.text}</div>
            {q.type === "scale" && (
              <div style={{ display: "flex", gap: 5, marginTop: 12, opacity: 0.6 }}>
                {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <div key={n} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                    {n}
                  </div>
                ))}
              </div>
            )}
            {(q.type === "open" || q.type === "reflect") && (
              <div style={{ width: "100%", height: 48, border: "1px dashed var(--warm)", borderRadius: 8, marginTop: 12, background: "var(--cream)" }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Library list ───────────────────────────────────────────────────────────
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Biblioteca de Exercícios</h2>
        <p>Clique num exercício para ver os detalhes ou editá-lo.</p>
      </div>

      {error && <p className="error-msg" role="alert">{error}</p>}

      <div className="grid-auto">
        {exercises.map((ex) => (
          <div
            key={ex.id}
            className="ex-card"
            style={{ position: "relative", cursor: "pointer" }}
            onClick={() => setPreviewEx(ex)}
            role="button"
            tabIndex={0}
            aria-label={`Ver exercício ${ex.title}`}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPreviewEx(ex)}
          >
            <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
              <button
                aria-label={`Editar ${ex.title}`}
                title="Editar"
                onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}
                style={{ background: "var(--cream)", border: "1px solid var(--warm)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✏️
              </button>
              <button
                aria-label={`Excluir ${ex.title}`}
                title="Excluir"
                onClick={(e) => { e.stopPropagation(); setDeletingEx(ex); }}
                style={{ background: "var(--cream)", border: "1px solid var(--danger)", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--danger)", opacity: 0.75 }}
              >
                🗑️
              </button>
            </div>

            <span className={`ex-cat ${CATEGORY_CLASS[ex.category] || ""}`}>
              {ex.category}
            </span>
            <div className="ex-title" style={{ paddingRight: 60 }}>{ex.title}</div>
            <div className="ex-desc">{ex.description}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
              📝 {parseQuestions(ex).length} perguntas
            </div>
          </div>
        ))}

        {exercises.length === 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <EmptyState icon="📭" message="Nenhum exercício na biblioteca." />
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deletingEx && (
        <div className="delete-overlay" onClick={() => setDeletingEx(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delex-title">
            <div className="delete-icon" aria-hidden="true" style={{ fontSize: 42, marginBottom: 16 }}>🗑️</div>
            <div id="delex-title" className="delete-title" style={{ fontSize: 20 }}>Excluir exercício?</div>
            <div className="delete-desc" style={{ marginBottom: 24, fontSize: 14 }}>
              Tem certeza que deseja excluir <strong>"{deletingEx.title}"</strong>?
              <br /><br />
              Esta ação removerá o exercício da biblioteca e das tarefas pendentes dos pacientes. As respostas antigas serão mantidas no histórico.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setDeletingEx(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}