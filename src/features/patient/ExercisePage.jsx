import { useState, useRef, useEffect, useCallback } from "react";
import db from "../../services/db";
import { parseQuestions, serializeAnswers } from "../../utils/parsing";
import { LOGO_PATH, LS_LAST_ACTION } from "../../utils/constants";
import CelebrationOverlay from "../../components/ui/CelebrationOverlay";
import "./ExercisePage.css";

/* ══════════════════════════════════════════════════════════════
   SliderEmoji  — arrastar para selecionar emoção + intensidade
   ══════════════════════════════════════════════════════════════ */
const SLIDER_EMOJIS = [
  { val: 1, emoji: "😔", label: "Muito mal" },
  { val: 2, emoji: "😞", label: "Mal" },
  { val: 3, emoji: "😐", label: "Neutro" },
  { val: 4, emoji: "🙂", label: "Bem" },
  { val: 5, emoji: "😄", label: "Muito bem" },
];

function SliderEmoji({ value, onChange, emojis = SLIDER_EMOJIS, question }) {
  const current = emojis.find((e) => e.val === Number(value)) ?? null;
  return (
    <div className="slider-emoji">
      <p className="exercise-page__question-text">{question.text}</p>

      {/* Emoji central animado */}
      <div className="slider-emoji__display" aria-live="polite">
        {current ? (
          <>
            <span className="slider-emoji__icon" key={current.val}>{current.emoji}</span>
            <span className="slider-emoji__label">{current.label}</span>
          </>
        ) : (
          <span className="slider-emoji__placeholder">👆 Arraste para escolher</span>
        )}
      </div>

      {/* Slider nativo */}
      <input
        type="range"
        className="slider-emoji__range"
        min={1}
        max={emojis.length}
        step={1}
        value={value || 1}
        onChange={(e) => onChange(e.target.value)}
        aria-label={question.text}
        aria-valuetext={current?.label ?? ""}
      />

      {/* Legenda de extremos */}
      <div className="slider-emoji__ticks" aria-hidden="true">
        {emojis.map((e) => (
          <button
            key={e.val}
            type="button"
            className={[
              "slider-emoji__tick",
              Number(value) === e.val ? "slider-emoji__tick--active" : "",
            ].join(" ")}
            onClick={() => onChange(String(e.val))}
            aria-label={e.label}
          >
            {e.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BreathingExercise  — anel animado inhala / segura / expira
   ══════════════════════════════════════════════════════════════ */
const BREATH_PHASES = [
  { key: "inhale",  label: "Inspire",  color: "#4a9c5d", seconds: 4 },
  { key: "hold",   label: "Segure",   color: "#2b6cb0", seconds: 4 },
  { key: "exhale", label: "Expire",   color: "#805ad5", seconds: 6 },
];

function BreathingExercise({ question, onComplete }) {
  const totalCycles = question.cycles ?? 3;
  const phases      = BREATH_PHASES;

  const [started,      setStarted]      = useState(false);
  const [phaseIdx,     setPhaseIdx]     = useState(0);
  const [cycle,        setCycle]        = useState(1);
  const [countdown,    setCountdown]    = useState(phases[0].seconds);
  const [finished,     setFinished]     = useState(false);
  const timerRef = useRef(null);

  const phase = phases[phaseIdx];

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const advance = useCallback(() => {
    setCountdown((prev) => {
      if (prev > 1) return prev - 1;

      // fim desta fase
      clearTimer();
      const nextPhaseIdx = (phaseIdx + 1) % phases.length;
      const endOfCycle   = nextPhaseIdx === 0;
      const nextCycle    = endOfCycle ? cycle + 1 : cycle;

      if (endOfCycle && nextCycle > totalCycles) {
        setFinished(true);
        setStarted(false);
        onComplete && onComplete("done");
        return 0;
      }

      setPhaseIdx(nextPhaseIdx);
      if (endOfCycle) setCycle(nextCycle);
      setCountdown(phases[nextPhaseIdx].seconds);
      return phases[nextPhaseIdx].seconds;
    });
  }, [phaseIdx, cycle, totalCycles, phases, onComplete]);

  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(advance, 1000);
    return clearTimer;
  }, [started, advance]);

  // progresso do anel SVG (0 → 1)
  const ringProgress = started
    ? 1 - (countdown - 1) / (phase.seconds - 1 || 1)
    : 0;
  const radius = 54;
  const circ   = 2 * Math.PI * radius;
  const dash   = circ * ringProgress;

  return (
    <div className="breathing">
      <p className="exercise-page__question-text">{question.text}</p>

      {/* Anel SVG */}
      <div className="breathing__ring-wrap">
        <svg viewBox="0 0 120 120" className="breathing__svg" aria-hidden="true">
          {/* trilha */}
          <circle cx="60" cy="60" r={radius} className="breathing__track" />
          {/* progresso */}
          <circle
            cx="60" cy="60" r={radius}
            className="breathing__arc"
            style={{
              stroke: phase.color,
              strokeDasharray: `${dash} ${circ}`,
              transition: started ? "stroke-dasharray 1s linear" : "none",
            }}
          />
        </svg>

        {/* Texto central */}
        <div className="breathing__center" style={{ color: phase.color }}>
          {finished ? (
            <>
              <span className="breathing__done-icon">✅</span>
              <span className="breathing__done-txt">Concluído</span>
            </>
          ) : started ? (
            <>
              <span className="breathing__phase-label">{phase.label}</span>
              <span className="breathing__countdown">{countdown}s</span>
            </>
          ) : (
            <span className="breathing__idle">Pronto?</span>
          )}
        </div>
      </div>

      {/* Ciclos */}
      {!finished && (
        <p className="breathing__cycles" aria-live="polite">
          {started
            ? `Ciclo ${cycle} de ${totalCycles}`
            : `${totalCycles} ciclos · ${phases.map((p) => p.seconds + "s").join(" – ")}`}
        </p>
      )}

      {/* Botão iniciar / reiniciar */}
      {!finished && (
        <button
          className="breathing__btn"
          onClick={() => {
            setPhaseIdx(0);
            setCycle(1);
            setCountdown(phases[0].seconds);
            setStarted(true);
          }}
        >
          {started ? "Reiniciar" : "Começar respiração"}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ExercisePage — player principal
   ══════════════════════════════════════════════════════════════ */
export default function ExercisePage({ exercise, session, onBack }) {
  const questions = parseQuestions(exercise);

  const [answers, setAnswers] = useState(() => {
    const init = {};
    questions.forEach((q) => { init[q.id] = ""; });
    return init;
  });

  const [step,        setStep]        = useState(0);
  const [done,        setDone]        = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [celebrating, setCelebrating] = useState(false);
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

      setCelebrating(true);
      setTimeout(() => {
        setCelebrating(false);
        setDone(true);
      }, 3400);

    } catch (e) {
      console.error("[ExercisePage]", e);
      alert("Erro ao salvar respostas: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  // slider_emoji e breathing são considerados respondidos assim que
  // têm qualquer valor (breathing marca "done" ao completar)
  const canAdvance =
    !q ||
    q.type === "instruction" ||
    q.type === "reflect" ||
    q.type === "breathing" ||
    answers[q.id] !== "";

  /* ── Tela de conclusão ── */
  if (done) {
    return (
      <div className="exercise-page__done-screen">
        <div className="exercise-page__done-card">
          <img
            src={LOGO_PATH}
            alt="Equilibre"
            className="exercise-page__done-logo"
          />
          <div className="exercise-page__done-icon" aria-hidden="true">🎉</div>
          <h2 className="exercise-page__done-title">Exercício concluído!</h2>
          <p className="exercise-page__done-desc">
            Suas respostas foram salvas. Sua psicóloga poderá acompanhar o seu
            progresso. Parabéns por cuidar de você!
          </p>
          <button
            className="exercise-page__done-btn"
            onClick={onBack}
          >
            Voltar aos exercícios
          </button>
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <>
      <CelebrationOverlay active={celebrating} />

      <div className="exercise-page__wrapper">
        <div className="exercise-page">

          {/* ── Header ── */}
          <header className="exercise-page__header">
            <button
              className="exercise-page__back-btn"
              onClick={onBack}
              aria-label="Voltar aos exercícios"
            >
              ← Voltar
            </button>
            <div className="exercise-page__title">{exercise.title}</div>
            <div
              className="exercise-page__counter"
              aria-live="polite"
              aria-label={`Pergunta ${step + 1} de ${questions.length}`}
            >
              {step + 1} / {questions.length}
            </div>
          </header>

          {/* ── Barra de progresso ── */}
          <div
            className="exercise-page__progress-track"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do exercício"
          >
            <div
              className="exercise-page__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* ── Card da pergunta ── */}
          <div className="exercise-page__question-card">
            <div className="exercise-page__step-label">Pergunta {step + 1}</div>

            {/* Instrução */}
            {q.type === "instruction" && (
              <div className="exercise-page__instruction">{q.text}</div>
            )}

            {/* Reflexão */}
            {q.type === "reflect" && (
              <>
                <div className="exercise-page__reflect-text">{q.text}</div>
                <label htmlFor={`ans-${q.id}`} className="sr-only">Reflexão (opcional)</label>
                <textarea
                  id={`ans-${q.id}`}
                  className="exercise-page__textarea"
                  placeholder="Escreva sua reflexão aqui... (opcional)"
                  value={answers[q.id]}
                  onChange={(e) => setAns(e.target.value)}
                />
              </>
            )}

            {/* Aberta */}
            {q.type === "open" && (
              <>
                <div className="exercise-page__question-text">{q.text}</div>
                <label htmlFor={`ans-${q.id}`} className="sr-only">Sua resposta</label>
                <textarea
                  id={`ans-${q.id}`}
                  className="exercise-page__textarea"
                  placeholder="Escreva sua resposta aqui..."
                  value={answers[q.id]}
                  onChange={(e) => setAns(e.target.value)}
                />
              </>
            )}

            {/* Escala 0-10 */}
            {q.type === "scale" && (
              <>
                <div className="exercise-page__question-text">{q.text}</div>
                <fieldset className="exercise-page__scale-fieldset">
                  <legend className="sr-only">Escolha um valor de 0 a 10</legend>
                  <div className="exercise-page__scale-row">
                    {Array.from({ length: 11 }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={[
                          "exercise-page__scale-btn",
                          answers[q.id] == i ? "exercise-page__scale-btn--selected" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => setAns(String(i))}
                        aria-pressed={answers[q.id] == i}
                        aria-label={`${i}`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="exercise-page__scale-labels" aria-hidden="true">
                    <span>Nenhum</span>
                    <span>Máximo</span>
                  </div>
                </fieldset>
              </>
            )}

            {/* ✨ NOVO: Slider emocional */}
            {q.type === "slider_emoji" && (
              <SliderEmoji
                question={q}
                value={answers[q.id]}
                onChange={setAns}
                emojis={q.emojis ?? undefined}
              />
            )}

            {/* ✨ NOVO: Respiração animada */}
            {q.type === "breathing" && (
              <BreathingExercise
                question={q}
                onComplete={() => setAns("done")}
              />
            )}

            {/* ── Navegação ── */}
            <div className="exercise-page__nav">
              <button
                className="exercise-page__nav-btn exercise-page__nav-btn--prev"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                aria-disabled={step === 0}
              >
                ← Anterior
              </button>
              <button
                className="exercise-page__nav-btn exercise-page__nav-btn--next"
                onClick={next}
                disabled={!canAdvance || saving || celebrating}
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
    </>
  );
}
