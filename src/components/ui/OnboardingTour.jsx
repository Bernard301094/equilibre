import { useState, useEffect, useCallback } from "react";
import "./OnboardingTour.css";

const TOUR_KEY = "equilibre_tour_done";

const STEPS = [
  {
    icon: "🌱",
    title: "Bem-vinda ao seu jardim",
    body:
      "Este é o seu espaço de cuidado. Tudo aqui foi pensado para te ajudar a crescer — no seu ritmo, do seu jeito.",
    hint: null,
  },
  {
    icon: "🪴",
    title: "Sua planta de autocuidado",
    body:
      "Cada vez que você registar como está se sentindo ou completar um exercício, sua planta cresce. Quanto mais constante, mais ela floresce.",
    hint: "Ela reflete a sua sequência de dias ativos.",
  },
  {
    icon: "📓",
    title: "O Diário Emocional",
    body:
      "É o lugar para registar o que você está sentindo hoje — sem julgamento, sem pressão. Algumas linhas já fazem diferença.",
    hint: 'Toque em "Vamos regar agora?" na tela inicial para começar.',
  },
  {
    icon: "📋",
    title: "Seus Exercícios",
    body:
      "Sua psicóloga pode enviar exercícios personalizados. Você os encontra na aba 'Exercícios' e pode fazer no seu tempo.'",
    hint: "Nenhum exercício aparecerá aqui até que sua psicóloga envie um.",
  },
  {
    icon: "✨",
    title: "Tudo pronto!",
    body:
      "Você está pronta para começar. Respire fundo e dê o primeiro passo — mesmo que seja pequeno.",
    hint: null,
    cta: "Começar agora",
  },
];

/**
 * OnboardingTour
 *
 * Props:
 *   onDone — callback fired when tour is dismissed
 *   force  — bool, show tour regardless of localStorage (for testing)
 */
export default function OnboardingTour({ onDone, force = false }) {
  const [visible, setVisible] = useState(false);
  const [step,    setStep]    = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const already = localStorage.getItem(TOUR_KEY);
    if (!already || force) {
      // small delay so the home page renders first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [force]);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(TOUR_KEY, "1");
      setVisible(false);
      setExiting(false);
      onDone?.();
    }, 320);
  }, [onDone]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  if (!visible) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={["ot-backdrop", exiting ? "ot-backdrop--exit" : ""].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Introdução ao Equilibre"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div className={["ot-card", exiting ? "ot-card--exit" : ""].filter(Boolean).join(" ")}>

        {/* ── Progress dots ── */}
        <div className="ot-dots" role="tablist" aria-label="Progresso do tour">
          {STEPS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`Passo ${i + 1}`}
              className={["ot-dot", i === step ? "ot-dot--active" : "", i < step ? "ot-dot--done" : ""].filter(Boolean).join(" ")}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* ── Skip ── */}
        <button
          className="ot-skip"
          onClick={dismiss}
          aria-label="Pular introdução"
          type="button"
        >
          Pular
        </button>

        {/* ── Step content ── */}
        <div className="ot-body" key={step}>
          <div className="ot-icon" aria-hidden="true">{s.icon}</div>
          <h2 className="ot-title">{s.title}</h2>
          <p className="ot-desc">{s.body}</p>
          {s.hint && (
            <div className="ot-hint" role="note">
              <span className="ot-hint__icon" aria-hidden="true">💡</span>
              <span>{s.hint}</span>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <div className="ot-nav">
          {step > 0 ? (
            <button
              className="ot-btn ot-btn--ghost"
              onClick={prev}
              type="button"
            >
              ← Anterior
            </button>
          ) : (
            <span />
          )}

          <button
            className={["ot-btn", isLast ? "ot-btn--primary ot-btn--cta" : "ot-btn--primary"].join(" ")}
            onClick={next}
            type="button"
          >
            {s.cta ?? (isLast ? "Começar" : "Próximo →")}
          </button>
        </div>

      </div>

      {/* floating leaves decoration */}
      <div className="ot-leaves" aria-hidden="true">
        {[..."🍃🌿🌱🍃🌿"].map((l, i) => (
          <span key={i} className="ot-leaf" style={{ "--i": i }}>{l}</span>
        ))}
      </div>
    </div>
  );
}