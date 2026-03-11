import React, { useEffect, useRef } from "react";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = "danger", // "danger" | "success"
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}) {
  const cancelRef = useRef(null);

  // Fecha o modal com a tecla Escape e foca no botão de cancelar ao abrir
  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = type === "danger";
  const icon = isDanger ? "⚠️" : "🌱";

  return (
    <div className="cd-overlay" onClick={onCancel} role="presentation">
      <div
        className="cd-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
      >
        <div className={`cd-icon ${isDanger ? "cd-icon--danger" : "cd-icon--success"}`}>
          {icon}
        </div>
        
        <h3 id="cd-title" className="cd-title">{title}</h3>
        <p className="cd-message">{message}</p>
        
        <div className="cd-actions">
          <button ref={cancelRef} className="cd-btn cd-btn--cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button 
            className={`cd-btn ${isDanger ? "cd-btn--danger" : "cd-btn--success"}`} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}