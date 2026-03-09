import { useEffect, useRef, useState } from "react";
import "./ConfirmDialog.css";

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
  const [typed, setTyped] = useState("");
  const inputRef          = useRef(null);
  const cancelRef         = useRef(null);
  const restoreRef        = useRef(null);

  // Focus trap: focus input (keyword) or cancel button on mount; restore on close
  useEffect(() => {
    restoreRef.current = document.activeElement;
    (keyword ? inputRef.current : cancelRef.current)?.focus();
    return () => restoreRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key closes dialog
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const canConfirm = !loading && (!keyword || typed === keyword);

  return (
    <div
      className="cd-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
      >
        {icon && (
          <div className="cd-modal__icon" aria-hidden="true">
            {icon}
          </div>
        )}

        {title && (
          <div id="confirm-dialog-title" className="cd-modal__title">
            {title}
          </div>
        )}

        {description && (
          <div
            id="confirm-dialog-desc"
            className={`cd-modal__desc${keyword ? "" : " cd-modal__desc--spacious"}`}
          >
            {description}
          </div>
        )}

        {keyword && (
          <div className="cd-keyword-block">
            <p className="cd-keyword-block__hint">
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
              className={`cd-keyword-block__input${
                typed === keyword ? " cd-keyword-block__input--valid" : ""
              }`}
            />
          </div>
        )}

        {error && (
          <p className="cd-modal__error" role="alert">{error}</p>
        )}

        <div className="cd-modal__actions">
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