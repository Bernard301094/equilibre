import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import EmptyState from "../../components/ui/EmptyState";
import "./PatientHistory.css";

export default function PatientHistory({ session }) {
  const [responses, setResponses] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading,   setLoading]   = useState(true);

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

  if (loading) return <p className="ph-loading">Carregando histórico...</p>;

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h2>🕰️ Meu Histórico</h2>
        <p>Todos os exercícios que você concluiu</p>
      </div>

      {responses.length === 0 && (
        <EmptyState icon="📭" message="Nenhum exercício concluído ainda." />
      )}

      <div className="ph-list">
        {responses.map((r) => {
          const ex        = exercises.find((e) => e.id === r.exercise_id);
          const questions = ex ? parseQuestions(ex) : [];
          const answers   = parseAnswers(r);
          const answerMap = matchAnswersToQuestions(questions, answers);

          return (
            <div key={r.id} className="card ph-entry">
              <div className="ph-entry__title">
                {ex?.title || "Exercício removido"}
              </div>
              <div className="ph-entry__date">
                {new Date(r.completed_at).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day:     "numeric",
                  month:   "long",
                })}
              </div>

              <div className="ph-entry__answers">
                {questions.map((q) => {
                  if (q.type === "instruction") return null;
                  const val = answerMap[q.id];
                  if (!val) return null;
                  return (
                    <div key={q.id} className="ph-response">
                      <div className="ph-response__question">{q.text}</div>
                      <div className="ph-response__answer">{val}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}