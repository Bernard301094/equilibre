import { useEffect, useRef } from "react";
import "./EmptyState.css";

/**
 * EmptyState — humanised empty state with SVG illustrations,
 * encouraging copy and an optional CTA.
 *
 * Props:
 *   variant  — "exercises" | "patients" | "diary" | "generic" (default "generic")
 *   message  — primary text  (falls back to variant default)
 *   sub      — secondary text (falls back to variant default)
 *   action   — { label, onClick }
 *   animate  — bool, default true
 */

/* ── Per-variant defaults ─────────────────────────────────── */
const VARIANTS = {
  exercises: {
    illustration: <IllustrationSeed />,
    message: "Nenhum exercício por enquanto",
    sub: "Quando sua psicóloga enviar algo, ele aparecerá aqui. Por ora, respire.",
  },
  patients: {
    illustration: <IllustrationGarden />,
    message: "Seu jardim está aguardando",
    sub: "Convide seu primeiro paciente e comece a acompanhar o crescimento dele.",
  },
  diary: {
    illustration: <IllustrationLeaf />,
    message: "Nenhum registro ainda",
    sub: "Seu diário emocional nasce hoje. Como você está se sentindo agora?",
  },
  generic: {
    illustration: <IllustrationPot />,
    message: "Nada por aqui ainda",
    sub: "Em breve algo vai florescer.",
  },
};

export default function EmptyState({
  variant = "generic",
  message,
  sub,
  action,
  animate = true,
}) {
  const cfg = VARIANTS[variant] ?? VARIANTS.generic;
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!animate || !wrapRef.current) return;
    // staggered entrance
    const els = wrapRef.current.querySelectorAll("[data-anim]");
    els.forEach((el, i) => {
      el.style.animationDelay = `${i * 120}ms`;
      el.classList.add("es-enter");
    });
  }, [animate]);

  return (
    <div ref={wrapRef} className="empty-state" role="status" aria-live="polite">
      <div className="empty-state__illustration" data-anim aria-hidden="true">
        {cfg.illustration}
        <div className="empty-state__glow" aria-hidden="true" />
      </div>

      <div className="empty-state__copy" data-anim>
        <p className="empty-state__message">{message ?? cfg.message}</p>
        {(sub ?? cfg.sub) && (
          <p className="empty-state__sub">{sub ?? cfg.sub}</p>
        )}
      </div>

      {action && (
        <div data-anim>
          <button
            className="empty-state__action"
            onClick={action.onClick}
            type="button"
          >
            <span className="empty-state__action-icon" aria-hidden="true">✦</span>
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── SVG Illustrations ────────────────────────────────────── */

function IllustrationSeed() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="es-svg">
      {/* soil */}
      <ellipse cx="60" cy="96" rx="38" ry="8" fill="var(--es-soil)" opacity=".5" />
      {/* pot */}
      <path d="M42 80 L46 96 H74 L78 80Z" fill="var(--es-pot)" />
      <rect x="39" y="76" width="42" height="7" rx="3.5" fill="var(--es-pot-rim)" />
      {/* stem */}
      <path d="M60 76 Q60 58 60 46" stroke="var(--es-stem)" strokeWidth="3" strokeLinecap="round" />
      {/* seed sprout */}
      <ellipse cx="60" cy="44" rx="10" ry="14" fill="var(--es-leaf-a)" className="es-svg__sprout" />
      <ellipse cx="60" cy="44" rx="10" ry="14" fill="var(--es-leaf-b)" opacity=".4"
        transform="rotate(45 60 44)" className="es-svg__sprout" style={{ animationDelay: "0.15s" }} />
      {/* tiny sparkles */}
      <circle cx="82" cy="38" r="2.5" fill="var(--es-spark)" className="es-svg__sparkle" />
      <circle cx="38" cy="32" r="2"   fill="var(--es-spark)" className="es-svg__sparkle" style={{ animationDelay: "0.4s" }} />
      <circle cx="90" cy="58" r="1.5" fill="var(--es-spark)" className="es-svg__sparkle" style={{ animationDelay: "0.7s" }} />
    </svg>
  );
}

function IllustrationGarden() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="es-svg">
      <ellipse cx="60" cy="100" rx="50" ry="9" fill="var(--es-soil)" opacity=".4" />
      {/* left plant */}
      <path d="M32 92 Q32 70 32 58" stroke="var(--es-stem)" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="32" cy="54" rx="10" ry="13" fill="var(--es-leaf-a)" opacity=".8" />
      {/* center taller plant */}
      <path d="M60 92 Q60 62 60 38" stroke="var(--es-stem)" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="60" cy="34" rx="13" ry="17" fill="var(--es-leaf-b)" />
      <ellipse cx="60" cy="34" rx="9" ry="13" fill="var(--es-leaf-a)" opacity=".7" transform="rotate(30 60 34)" />
      {/* right plant */}
      <path d="M88 92 Q88 74 88 64" stroke="var(--es-stem)" strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="88" cy="60" rx="9" ry="12" fill="var(--es-leaf-a)" opacity=".9" />
      {/* sparkles */}
      <circle cx="72" cy="24" r="2.5" fill="var(--es-spark)" className="es-svg__sparkle" />
      <circle cx="44" cy="44" r="2"   fill="var(--es-spark)" className="es-svg__sparkle" style={{ animationDelay: "0.3s" }} />
    </svg>
  );
}

function IllustrationLeaf() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="es-svg">
      <path
        d="M60 100 Q28 80 28 50 Q28 20 60 18 Q92 20 92 50 Q92 80 60 100Z"
        fill="var(--es-leaf-a)"
        className="es-svg__leaf"
      />
      <path
        d="M60 100 Q40 78 40 52 Q40 30 60 20"
        fill="var(--es-leaf-b)"
        opacity=".4"
      />
      <path
        d="M60 100 Q60 70 60 20"
        stroke="var(--es-stem)"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity=".6"
      />
      {/* veins */}
      <path d="M60 70 Q48 60 44 50" stroke="white" strokeWidth="1.2" opacity=".5" strokeLinecap="round" />
      <path d="M60 70 Q72 60 76 50" stroke="white" strokeWidth="1.2" opacity=".5" strokeLinecap="round" />
      <path d="M60 50 Q52 42 50 36" stroke="white" strokeWidth="1" opacity=".4" strokeLinecap="round" />
      <circle cx="85" cy="28" r="2.5" fill="var(--es-spark)" className="es-svg__sparkle" />
      <circle cx="35" cy="38" r="2"   fill="var(--es-spark)" className="es-svg__sparkle" style={{ animationDelay: "0.5s" }} />
    </svg>
  );
}

function IllustrationPot() {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="es-svg">
      <path d="M40 72 L45 100 H75 L80 72Z" fill="var(--es-pot)" />
      <rect x="36" y="66" width="48" height="9" rx="4.5" fill="var(--es-pot-rim)" />
      <ellipse cx="60" cy="66" rx="24" ry="7" fill="var(--es-soil)" opacity=".6" />
      {/* dotted lines — empty soil */}
      <circle cx="50" cy="66" r="2" fill="var(--es-stem)" opacity=".3" />
      <circle cx="60" cy="64" r="2" fill="var(--es-stem)" opacity=".3" />
      <circle cx="70" cy="66" r="2" fill="var(--es-stem)" opacity=".3" />
      <circle cx="78" cy="36" r="3" fill="var(--es-spark)" className="es-svg__sparkle" />
      <circle cx="42" cy="42" r="2" fill="var(--es-spark)" className="es-svg__sparkle" style={{ animationDelay: "0.6s" }} />
    </svg>
  );
}