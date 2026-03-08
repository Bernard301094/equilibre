import { useState, useRef } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { serializeAnswers } from "../../utils/parsing";
import { LOGO_PATH, LS_LAST_ACTION } from "../../utils/constants";

export default function ExercisePage({ exercise, session, onBack }) {
  const questions = parseQuestions(exercise);

  const [answers, setAnswers] = useState(() => {
    const init = {};
    questions.forEach((q) => { init[q.id] = ""; });
    return init;
  });

  const [step,   setStep]   = useState(0);
  const [done,   setDone]   = useState(false);
  const [saving, setSaving] = useState(false);
  const inflightRef = useRef(false);

  const q        = questions[step];
  const progress = questions.length > 0 ? (step / questions.length) * 100 : 0;

  const setAns = (val) =>
    setAnswers((prev) => ({ ...prev, [q.id]: val }));

  const next = async () => {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (inflightRef.current || saving) return;
    inflightRef.current = true;
    setSaving(true);
    try {
      const assignments = await db.query(
        "assignments",
        { filter: { patient_id: session.id, exercise_id: exercise.id, status: "pending" }, select: "id" },
        session.access_token
      );
      const assignId = Array.isArray(assignments) && assignments.length > 0
        ? assignments[0].id
        : null;

      await db.insert(
        "responses",
        {
          id:           "r" + Date.now(),
          patient_id:   session.id,
          exercise_id:  exercise.id,
          completed_at: new Date().toISOString(),
          answers:      serializeAnswers(questions, answers),
        },
        session.access_token
      );

      if (assignId) {
        await db.update("assignments", { id: assignId }, { status: "done" }, session.access_token);
      }

      if (session.therapist_id) {
        await db.insert(
          "notifications",
          {
            id:             "n" + Date.now(),
            therapist_id:   session.therapist_id,
            patient_id:     session.id,
            patient_name:   session.name,
            exercise_title: exercise.title,
            created_at:     new Date().toISOString(),
            read:           false,
          },
          session.access_token
        ).catch(() => {});
      }

      localStorage.setItem(LS_LAST_ACTION, String(Date.now()));
      setDone(true);
    } catch (e) {
      console.error("[ExercisePage]", e);
      alert("Erro ao salvar respostas: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  /* ── Done screen ── */
  if (done) {
    return (
      <div className="ep-done-screen">
        <div className="question-card ep-done-card">
          <img src={LOGO_PATH} alt="Equilibre" className="ep-done-logo" />
          <h2 className="ep-done-title">Exercício concluído!</h2>
          <p className="ep-done-desc">
            Suas respostas foram salvas. Sua psicóloga poderá acompanhar o seu progresso.
            Parabéns por cuidar de você!
          </p>
          <button className="btn btn-sage ep-done-btn" onClick={onBack}>
            Voltar aos exercícios
          </button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const canAdvance =
    q.type === "instruction" ||
    q.type === "reflect" ||
    answers[q.id] !== "";

  return (
    <div className="ep-wrapper">
      <div className="exercise-page">
        {/* ── Header ── */}
        <div className="ep-header">
          <button className="btn btn-outline btn-sm" onClick={onBack}>← Voltar</button>
          <div className="ep-title">{exercise.title}</div>
          <div className="ep-step-counter" aria-live="polite">
            {step + 1} / {questions.length}
          </div>
        </div>

        {/* ── Progress bar ── */}
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── Question card ── */}
        <div className="question-card">
          <div className="q-step">Pergunta {step + 1}</div>

          {q.type === "instruction" && (
            <div className="q-instruction">{q.text}</div>
          )}

          {q.type === "reflect" && (
            <>
              <div className="q-reflect">{q.text}</div>
              <label htmlFor={`ans-${q.id}`} className="sr-only">Reflexão (opcional)</label>
              <textarea
                id={`ans-${q.id}`}
                className="q-textarea"
                placeholder="Escreva sua reflexão aqui... (opcional)"
                value={answers[q.id]}
                onChange={(e) => setAns(e.target.value)}
              />
            </>
          )}

          {q.type === "open" && (
            <>
              <div className="q-text">{q.text}</div>
              <label htmlFor={`ans-${q.id}`} className="sr-only">Sua resposta</label>
              <textarea
                id={`ans-${q.id}`}
                className="q-textarea"
                placeholder="Escreva sua resposta aqui..."
                value={answers[q.id]}
                onChange={(e) => setAns(e.target.value)}
              />
            </>
          )}

          {q.type === "scale" && (
            <>
              <div className="q-text">{q.text}</div>
              <fieldset className="ep-scale-fieldset">
                <legend className="sr-only">Escolha um valor de 0 a 10</legend>
                <div className="scale-row">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`scale-btn ${answers[q.id] == i ? "selected" : ""}`}
                      onClick={() => setAns(String(i))}
                      aria-pressed={answers[q.id] == i}
                      aria-label={String(i)}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {/* ── Navigation ── */}
          <div className="q-nav">
            <button
              className="btn btn-outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              aria-disabled={step === 0}
            >
              ← Anterior
            </button>
            <button
              className="btn btn-sage"
              onClick={next}
              disabled={!canAdvance || saving}
              aria-busy={saving}
            >
              {saving
                ? "Salvando..."
                : step === questions.length - 1
                ? "Concluir ✓"
                : "Próximo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}