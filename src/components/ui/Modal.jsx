import { useEffect, useRef } from "react";

/**
 * Generic overlay modal.
 *
 * Props:
 *   onClose     — called when backdrop is clicked or Escape is pressed
 *   children
 *   maxWidth    — default 520
 *   noPadding   — strips inner padding (for tabbed modals that manage their own)
 *   labelId     — id of the element that labels this dialog (for aria-labelledby)
 */
export default function Modal({
  onClose,
  children,
  maxWidth = 520,
  noPadding = false,
  labelId,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  // ── Focus trap ────────────────────────────────────────────────────────────
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const firstFocusable = dialogRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  // ── Tab trap ──────────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="modal"
        style={{
          maxWidth,
          padding: noPadding ? 0 : undefined,
          overflow: noPadding ? "hidden" : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}