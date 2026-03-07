import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { formatDate } from "../../utils/dates";
import { SkeletonResponses } from "../../components/ui/Skeleton";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";
import toast from "../../utils/toast";

/** Quick-select validation labels the therapist can stamp on a response */
const VALIDATIONS = [
  { emoji: "👏", label: "Parabéns!"        },
  { emoji: "💪", label: "Continue assim!"  },
  { emoji: "🌱", label: "Bom progresso!"   },
  { emoji: "🔄", label: "Reflita mais"     },
  { emoji: "❤️", label: "Aqui por você"    },
];

/**
 * Inline feedback panel for a single response.
 * Shows quick-select stamps AND a free-text comment field.
 * Saves to `responses.therapist_note` via PATCH.
 */
function FeedbackPanel({ response, session, onSaved }) {
  const [open,    setOpen]    = useState(false);
  const [text,    setText]    = useState(response.therapist_note ?? "");
  const [stamp,   setStamp]   = useState(response.therapist_stamp ?? "");
  const [saving,  setSaving]  = useState(false);
  const inflightRef = useRef(false);

  const hasExisting = !!(response.therapist_note || response.therapist_stamp);

  const handleSave = async () => {
    if (inflightRef.current || saving) return;
    if (!text.trim() && !stamp) {
      toast.error("Escreva um comentário ou selecione um selo.");
      return;
    }
    inflightRef.current = true;
    setSaving(true);
    try {
      await db.update(
        "responses",
        { id: response.id },
        {
          therapist_note:  text.trim() || null,
          therapist_stamp: stamp || null,
          noted_at:        new Date().toISOString(),
        },
        session.access_token
      );
      toast.success("Feedback enviado!");
      onSaved({ therapist_note: text.trim() || null, therapist_stamp: stamp || null });
      setOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  const handleClear = async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      await db.update(
        "responses",
        { id: response.id },
        { therapist_note: null, therapist_stamp: null, noted_at: null },
        session.access_token
      );
      setText("");
      setStamp("");
      toast.success("Feedback removido.");
      onSaved({ therapist_note: null, therapist_stamp: null });
      setOpen(false);
    } catch (e) {
      toast.error("Erro ao remover: " + e.message);
    } finally {
      inflightRef.current = false;
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Existing feedback summary */}
      {hasExisting && !open && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            background: "rgba(122,158,135,0.1)",
            border: "1px solid rgba(122,158,135,0.25)",
            borderRadius: 10,
            marginBottom: 8,
          }}
        >
          {response.therapist_stamp && (
            <span style={{ fontSize: 18 }} aria-hidden="true">
              {VALIDATIONS.find((v) => v.label === response.therapist_stamp)?.emoji ?? "💬"}
            </span>
          )}
          {response.therapist_note && (
            <span style={{ fontSize: 13, color: "var(--sage-dark)", fontStyle: "italic", flex: 1 }}>
              "{response.therapist_note}"
            </span>
          )}
          {!response.therapist_note && response.therapist_stamp && (
            <span style={{ fontSize: 13, color: "var(--sage-dark)", fontWeight: 600 }}>
              {response.therapist_stamp}
            </span>
          )}
          <button
            className="btn btn-outline btn-sm"
            style={{ flexShrink: 0, fontSize: 11 }}
            onClick={() => setOpen(true)}
          >
            ✏️ Editar
          </button>
        </div>
      )}

      {/* Toggle button */}
      {!open && (
        <button
          className="btn btn-outline btn-sm"
          style={{
            fontSize: 12,
            color: hasExisting ? "var(--text-muted)" : "var(--sage-dark)",
            borderColor: hasExisting ? "var(--warm)" : "rgba(122,158,135,0.4)",
          }}
          onClick={() => setOpen(true)}
        >
          {hasExisting ? "Ver feedback" : "💬 Deixar feedback"}
        </button>
      )}

      {/* Feedback panel */}
      {open && (
        <div
          style={{
            marginTop: 8,
            padding: "14px 16px",
            background: "var(--cream)",
            border: "1.5px solid rgba(122,158,135,0.3)",
            borderRadius: 12,
          }}
        >
          {/* Quick stamps */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 10 }}>
            Selos rápidos
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {VALIDATIONS.map((v) => (
              <button
                key={v.label}
                onClick={() => setStamp(stamp === v.label ? "" : v.label)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: `1.5px solid ${stamp === v.label ? "var(--sage-dark)" : "var(--warm)"}`,
                  background: stamp === v.label ? "rgba(122,158,135,0.15)" : "white",
                  color: stamp === v.label ? "var(--sage-dark)" : "var(--text-muted)",
                  fontWeight: stamp === v.label ? 700 : 400,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                <span aria-hidden="true">{v.emoji}</span>
                {v.label}
              </button>
            ))}
          </div>

          {/* Free-text comment */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 8 }}>
            Comentário (opcional)
          </div>
          <label htmlFor={`feedback-${response.id}`} className="sr-only">
            Comentário de feedback
          </label>
          <textarea
            id={`feedback-${response.id}`}
            className="q-textarea"
            placeholder="Escreva um comentário de encorajamento ou orientação..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{ resize: "vertical", marginBottom: 12 }}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {hasExisting && (
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: 12 }}
                onClick={handleClear}
              >
                🗑️ Remover
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-sage btn-sm"
              onClick={handleSave}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Salvando..." : "💾 Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResponsesView({ session }) {
  const [patients,   setPatients]   = useState([]);
  const [responses,  setResponses]  = useState([]);
  const [exercises,  setExercises]  = useState([]);
  const [selPatient, setSelPatient] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [p, ex] = await Promise.all([
          db.query(
            "users",
            { select: "id,name,avatar_url", filter: { therapist_id: session.id, role: "patient" } },
            session.access_token
          ),
          db.query("exercises", {}, session.access_token),
        ]);

        const pList = Array.isArray(p) ? p : [];
        const pIds  = pList.map((pt) => pt.id);

        const allResp = pIds.length > 0
          ? await db.query(
              "responses",
              { filterIn: { patient_id: pIds }, order: "completed_at.desc" },
              session.access_token
            ).then((r) => (Array.isArray(r) ? r : []))
          : [];

        if (active) {
          setPatients(pList);
          setExercises(Array.isArray(ex) ? ex : []);
          setResponses(allResp);
        }
      } catch (e) {
        console.error("[ResponsesView]", e);
        toast.error("Erro ao carregar respostas: " + e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  // Update a single response in local state when feedback is saved
  const handleFeedbackSaved = (responseId, updates) => {
    setResponses((prev) =>
      prev.map((r) => (r.id === responseId ? { ...r, ...updates } : r))
    );
  };

  if (loading) return <SkeletonResponses />;

  const filtered = selPatient
    ? responses.filter((r) => r.patient_id === selPatient.id)
    : responses;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Respostas dos Pacientes</h2>
        <p>Acompanhe o que seus pacientes responderam nos exercícios</p>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>

        {/* ── Filtro lateral ── */}
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Filtrar por paciente</h3>

          <div
            role="button"
            tabIndex={0}
            style={{
              padding: "9px 12px", borderRadius: 10, cursor: "pointer",
              background: !selPatient ? "rgba(122,158,135,0.12)" : "transparent",
              fontWeight: !selPatient ? 600 : 400, fontSize: 14,
              color: !selPatient ? "var(--sage-dark)" : "var(--text-muted)",
            }}
            onClick={() => setSelPatient(null)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelPatient(null)}
            aria-pressed={!selPatient}
          >
            Todos os pacientes
          </div>

          {patients.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, cursor: "pointer",
                background: selPatient?.id === p.id ? "rgba(122,158,135,0.12)" : "transparent",
                marginTop: 4,
              }}
              onClick={() => setSelPatient(p)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelPatient(p)}
              aria-pressed={selPatient?.id === p.id}
            >
              <AvatarDisplay name={p.name} avatarUrl={p.avatar_url} size={32} className="p-avatar" />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: selPatient?.id === p.id ? 600 : 400,
                  color: selPatient?.id === p.id ? "var(--sage-dark)" : "var(--text)",
                }}
              >
                {p.name}
              </span>
            </div>
          ))}

          {patients.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
              Nenhum paciente ainda.
            </p>
          )}
        </div>

        {/* ── Respostas ── */}
        <div>
          {filtered.length === 0 && (
            <EmptyState icon="🔍" message="Nenhuma resposta encontrada." />
          )}

          {filtered.map((r) => {
            const patient   = patients.find((p) => p.id === r.patient_id);
            const exercise  = exercises.find((e) => e.id === r.exercise_id);
            const questions = exercise ? parseQuestions(exercise) : [];
            const answers   = parseAnswers(r);
            const answerMap = matchAnswersToQuestions(questions, answers);

            return (
              <div key={r.id} className="card" style={{ marginBottom: 14 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16 }}>
                      {exercise?.title || "Exercício removido"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      {patient && (
                        <AvatarDisplay name={patient.name} avatarUrl={patient.avatar_url} size={16} />
                      )}
                      <span>
                        {patient?.name} · {formatDate(r.completed_at, { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <span className="response-badge badge-done">✓ Concluído</span>
                </div>

                {/* Q&A */}
                {questions.map((q) => {
                  if (q.type === "instruction") return null;
                  const val = answerMap[q.id];
                  if (!val) return null;
                  return (
                    <div key={q.id} className="response-item">
                      <div className="q-label">{q.text}</div>
                      <div className="q-answer">{val}</div>
                    </div>
                  );
                })}

                {/* ── Therapist feedback ── */}
                <div
                  style={{
                    borderTop: "1px solid var(--warm)",
                    marginTop: 12,
                    paddingTop: 12,
                  }}
                >
                  <FeedbackPanel
                    response={r}
                    session={session}
                    onSaved={(updates) => handleFeedbackSaved(r.id, updates)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}