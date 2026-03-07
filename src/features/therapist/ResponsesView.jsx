import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { formatDate } from "../../utils/dates";
import { SkeletonResponses } from "../../components/ui/Skeleton";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";
import toast from "../../utils/toast";

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
              <span style={{
                fontSize: 14,
                fontWeight: selPatient?.id === p.id ? 600 : 400,
                color: selPatient?.id === p.id ? "var(--sage-dark)" : "var(--text)",
              }}>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}