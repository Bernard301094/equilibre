import { useEffect, useRef, useState } from "react";
import "./ConfirmDialog.css";

/**
 * ConfirmDialog
 *
 * Props:
 * title        string
 * description  string
 * icon         string (emoji)
 * confirmLabel string   (default "Confirmar")
 * cancelLabel  string   (default "Cancelar")
 * danger       bool     — red confirm button
 * keyword      string   — if set, user must type this word to enable confirm
 * loading      bool
 * onConfirm    () => void
 * onClose      () => void
 * error        string
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
  const inputRef  = useRef(null);
  const cancelRef = useRef(null);
  const restoreRef = useRef(null);
  
  const [typed, setTyped] = useState("");

  // Focus inicial y restauración al cerrar
  useEffect(() => {
    restoreRef.current = document.activeElement;
    if (keyword && inputRef.current) {
      inputRef.current.focus();
    } else if (cancelRef.current) {
      cancelRef.current.focus();
    }
    return () => restoreRef.current?.focus();
  }, [keyword]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { 
      if (e.key === "Escape") onClose(); 
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const canConfirm = !loading && (!keyword || typed === keyword);

  return (
    <div
      className="confirm-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "confirm-dialog-title" : undefined}
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
      >
        {icon && (
          <div className="confirm-icon" aria-hidden="true">
            {icon}
          </div>
        )}

        {title && (
          <h3 id="confirm-dialog-title" className="confirm-title">
            {title}
          </h3>
        )}

        {description && (
          <p id="confirm-dialog-desc" className={`confirm-desc ${keyword ? 'with-keyword' : ''}`}>
            {description}
          </p>
        )}

        {keyword && (
          <div className="confirm-keyword-wrapper">
            <p className="confirm-keyword-hint">
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
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className={`confirm-input ${typed === keyword ? 'match' : ''}`}
            />
          </div>
        )}

        {error && (
          <p className="confirm-error-msg" role="alert">
            {error}
          </p>
        )}

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="confirm-btn confirm-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`confirm-btn ${danger ? "confirm-btn-danger" : "confirm-btn-primary"}`}
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