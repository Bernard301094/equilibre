import { useEffect, useRef } from "react";

/**
 * ConfirmDialog
 *
 * Props:
 *   title        string
 *   description  string
 *   icon         string (emoji)
 *   confirmLabel string   (default "Confirmar")
 *   cancelLabel  string   (default "Cancelar")
 *   danger       bool     — red confirm button
 *   keyword      string   — if set, user must type this word to enable confirm
 *   loading      bool
 *   onConfirm    () => void
 *   onClose      () => void
 *   error        string
 */
export default function ConfirmDialog({
  title,
  description,
  icon,
  confirmLabel = "Confirmar",
  cancelLabel  = "Cancelar",
  danger       = false,
  keyword,
  loading      = false,
  onConfirm,
  onClose,
  error,
}) {
  const inputRef    = useRef(null);
  const cancelRef   = useRef(null);
  const [typed, setTyped] = [
    useRef(""),
    (val) => {
      typed.current = val;
      forceRender((n) => n + 1);
    },
  ];
  const [, forceRender] = useReducerShim();

  // Focus cancel on mount, then restore on close
  const restoreRef = useRef(null);
  useEffect(() => {
    restoreRef.current = document.activeElement;
    (keyword ? inputRef.current : cancelRef.current)?.focus();
    return () => restoreRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const canConfirm = !loading && (!keyword || typed.current === keyword);

  return (
    <div
      className="delete-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="delete-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
      >
        {icon && (
          <div
            className="delete-icon"
            aria-hidden="true"
            style={{ fontSize: 42, marginBottom: 16 }}
          >
            {icon}
          </div>
        )}

        {title && (
          <div
            id="confirm-dialog-title"
            className="delete-title"
            style={{ fontSize: 20 }}
          >
            {title}
          </div>
        )}

        {description && (
          <div
            id="confirm-dialog-desc"
            className="delete-desc"
            style={{ marginBottom: keyword ? 16 : 24, fontSize: 14 }}
            dangerouslySetInnerHTML={undefined}
          >
            {description}
          </div>
        )}

        {keyword && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
              Digite <strong>{keyword}</strong> para confirmar:
            </p>
            <label htmlFor="confirm-dialog-input" className="sr-only">
              Confirmação — digitar {keyword}
            </label>
            <input
              id="confirm-dialog-input"
              ref={inputRef}
              type="text"
              autoComplete="off"
              value={typed.current}
              onChange={(e) => setTyped(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1.5px solid ${typed.current === keyword ? "var(--sage)" : "var(--warm)"}`,
                borderRadius: 10,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                background: "var(--cream)",
                color: "var(--text)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color .2s",
              }}
            />
          </div>
        )}

        {error && (
          <p className="error-msg" role="alert" style={{ marginBottom: 14 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            ref={cancelRef}
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={danger ? "btn-danger" : "btn btn-sage"}
            onClick={onConfirm}
            disabled={!canConfirm}
            aria-busy={loading}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Minimal local replacement for useState to avoid extra import complexity
// in the typed-keyword input above.
function useReducerShim() {
  const [n, setN] = [useRef(0), (fn) => { useRef(0).current = fn(0); }];
  return [n.current, setN];
}