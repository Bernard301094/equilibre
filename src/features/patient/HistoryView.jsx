import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import EmptyState from "../../components/ui/EmptyState";

export default function PatientHistory({ session }) {
  const [responses,  setResponses]  = useState([]);
  const [exercises,  setExercises]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [r, ex] = await Promise.all([
          db.query("responses", { filter: { patient_id: session.id }, order: "completed_at.desc" }, session.access_token),
          db.query("exercises", {}, session.access_token),
        ]);
        if (!active) return;
        setResponses(Array.isArray(r)  ? r  : []);
        setExercises(Array.isArray(ex) ? ex : []);
      } catch (e) {
        console.error("[PatientHistory]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  if (loading) return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando histórico...</p>;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>🕰️ Meu Histórico</h2>
        <p>Todos os exercícios que você concluiu</p>
      </div>

      {responses.length === 0 && (
        <EmptyState icon="📭" message="Nenhum exercício concluído ainda." />
      )}

      {responses.map((r) => {
        const ex        = exercises.find((e) => e.id === r.exercise_id);
        const questions = ex ? parseQuestions(ex) : [];
        const answers   = parseAnswers(r);
        const answerMap = matchAnswersToQuestions(questions, answers);

        return (
          <div key={r.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 17, marginBottom: 3 }}>
              {ex?.title || "Exercício removido"}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
              {new Date(r.completed_at).toLocaleDateString("pt-BR", {
                weekday: "long", day: "numeric", month: "long",
              })}
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
  );
}