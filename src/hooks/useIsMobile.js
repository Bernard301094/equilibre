import { useState, useEffect } from "react";

/**
 * useIsMobile — detecta viewport mobile via matchMedia.
 *
 * POR QUE matchMedia E NÃO window.resize + innerWidth?
 * ──────────────────────────────────────────────────────
 * `resize` no iOS Safari não dispara de forma confiável em
 * mudanças de orientação. `matchMedia('change')` é a API
 * correta para esse caso — dispara de forma síncrona em
 * todos os browsers, inclusive iOS Safari e Android WebViews.
 *
 * PONTO ÚNICO DE VERDADE:
 * ─────────────────────────────────────────────────────────
 * MOBILE_BREAKPOINT_PX é o único lugar que define o breakpoint
 * JS. Os arquivos CSS devem estar em sincronia:
 *   Sidebar.css:         @media (max-width: 767px)
 *   PatientLayout.css:   @media (min-width: 768px)
 *   TherapistLayout.css: @media (min-width: 768px) / (min-width: 1025px)
 */
export const MOBILE_BREAKPOINT_PX = 767;

export function useIsMobile(breakpointPx = MOBILE_BREAKPOINT_PX) {
  const query = `(max-width: ${breakpointPx}px)`;

  // Leitura síncrona inicial — garante valor correto mesmo que
  // o componente monte já em landscape após um refresh.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false; // SSR-safe
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(query);

    // Re-sincroniza imediatamente caso a orientação tenha mudado
    // entre o render inicial e a montagem do efeito.
    setIsMobile(mq.matches);

    const handler = (e) => setIsMobile(e.matches);

    // API moderna — Chrome 38+, Firefox 55+, Safari 14+
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    // Fallback Safari < 14 (deprecated, mas funcional em iOS antigos)
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, [query]); // query só muda se breakpointPx mudar — roda 1x no uso normal

  return isMobile;
}