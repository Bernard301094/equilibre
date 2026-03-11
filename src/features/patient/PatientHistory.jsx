import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { CATEGORY_CLASS } from "../../utils/constants";
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

  if (loading) {
    return (
      <div className="ph-loading" aria-live="polite">
        <span className="ph-loading__icon" aria-hidden="true">🕰️</span>
        <p>Carregando histórico…</p>
      </div>
    );
  }

  return (
    <div className="ph-page page-fade-in">

      {/* ── Header ── */}
      <header className="ph-header">
        <div className="ph-header__text">
          <h2 className="ph-header__title">🕰️ Meu Histórico</h2>
          <p className="ph-header__sub">Todos os exercícios que você concluiu</p>
        </div>
        {responses.length > 0 && (
          <div className="ph-counter" aria-label={`${responses.length} registros`}>
            <span className="ph-counter__dot" aria-hidden="true" />
            {responses.length} {responses.length === 1 ? "registro" : "registros"}
          </div>
        )}
      </header>

      {/* ── Empty ── */}
      {responses.length === 0 && (
        <div className="ph-empty">
          <EmptyState icon="📭" message="Nenhum exercício concluído ainda." />
        </div>
      )}

      {/* ── Lista ── */}
      <div className="ph-list" role="list">
        {responses.map((r) => {
          const ex        = exercises.find((e) => e.id === r.exercise_id);
          const questions = ex ? parseQuestions(ex) : [];
          const answers   = parseAnswers(r);
          const answerMap = matchAnswersToQuestions(questions, answers);
          const catClass  = ex?.category ? (CATEGORY_CLASS[ex.category] || "ph-cat--outro") : "ph-cat--outro";
          const answeredQs = questions.filter((q) => q.type !== "instruction" && answerMap[q.id]);

          // Verifica se há avaliação do terapeuta
          const hasTherapistEval = r.therapist_stamp || r.therapist_note;

          return (
            <article key={r.id} className="ph-entry" role="listitem">

              {/* Cabeçalho do card */}
              <div className="ph-entry__head">
                <div className="ph-entry__title-wrap">
                  {ex?.category && (
                    <span className={`ph-entry__cat ${catClass}`}>{ex.category}</span>
                  )}
                  <h3 className="ph-entry__title">
                    {ex?.title || "Exercício removido"}
                  </h3>
                  <p className="ph-entry__date">
                    {new Date(r.completed_at).toLocaleDateString("pt-BR", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </p>
                </div>

                <div className="ph-entry__done-badge" aria-label="Concluído">
                  <span aria-hidden="true">✅</span>
                  <span>Concluído</span>
                </div>
              </div>

              {/* Divisor */}
              {answeredQs.length > 0 && (
                <hr className="ph-entry__divider" aria-hidden="true" />
              )}

              {/* Respostas do paciente */}
              {answeredQs.length > 0 && (
                <div className="ph-entry__answers">
                  {answeredQs.map((q) => {
                    const val = answerMap[q.id];
                    const isScale = q.type === "scale";
                    return (
                      <div
                        key={q.id}
                        className={`ph-response${isScale ? " ph-response--scale" : ""}`}
                      >
                        <p className="ph-response__question">{q.text}</p>
                        <p className="ph-response__answer">{val}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Avaliação do Terapeuta ── */}
              {hasTherapistEval && (
                <>
                  <hr className="ph-entry__divider" aria-hidden="true" />
                  <div
                    className="ph-therapist-eval"
                    role="region"
                    aria-label="Avaliação do terapeuta"
                  >
                    {/* Header da avaliação */}
                    <div className="ph-therapist-eval__header">
                      <span className="ph-therapist-eval__avatar" aria-hidden="true">
                        🧑‍⚕️
                      </span>
                      <div className="ph-therapist-eval__meta">
                        <span className="ph-therapist-eval__label">
                          Avaliação do Terapeuta
                        </span>
                        {r.noted_at && (
                          <span className="ph-therapist-eval__date">
                            {new Date(r.noted_at).toLocaleDateString("pt-BR", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sello / Stamp */}
                    {r.therapist_stamp && (
                      <div
                        className="ph-therapist-eval__stamp"
                        aria-label={`Selo do terapeuta: ${r.therapist_stamp}`}
                      >
                        <span className="ph-therapist-eval__stamp-icon" aria-hidden="true">
                          🏅
                        </span>
                        <span className="ph-therapist-eval__stamp-text">
                          {r.therapist_stamp}
                        </span>
                      </div>
                    )}

                    {/* Nota / Comentario */}
                    {r.therapist_note && (
                      <div className="ph-therapist-eval__note">
                        <p className="ph-therapist-eval__note-label">Comentário</p>
                        <p className="ph-therapist-eval__note-text">
                          {r.therapist_note}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

            </article>
          );
        })}
      </div>
    </div>
  );
}