import { useState, useRef } from "react";
import db from "../../../services/db";
import { formatDateTime } from "../../../utils/dates";
import "./FeedbackTab.css";

/**
 * FeedbackTab
 * Shown inside PatientModal (therapist side).
 * Lets the therapist write public feedback the patient can read.
 */
export default function FeedbackTab({
  patient,
  session,
  feedbacks,
  onFeedbacksChange,
}) {
  const [isWriting, setIsWriting] = useState(false);
  const [text,      setText]      = useState("");
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null); // { type: "success"|"error", msg }
  const inflightRef = useRef(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const cancelWriting = () => {
    setIsWriting(false);
    setText("");
  };

  const saveFeedback = async () => {
    if (!text.trim() || inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    try {
      // ✅ Sin "id" ni "created_at" — Supabase los genera automáticamente
      const payload = {
        patient_id:   patient.id,
        therapist_id: session.id,
        message:      text.trim(),
        read:         false,
      };

      // db.insert retorna el objeto completo con id y created_at reales
      const saved = await db.insert("therapist_feedback", payload, session.access_token);

      onFeedbacksChange([saved, ...feedbacks]);
      setText("");
      setIsWriting(false);
      showToast("success", "Feedback enviado com sucesso! ✅");
    } catch (e) {
      showToast("error", "Erro ao enviar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  return (
    <div className="feedback-tab">

      {/* ── Toast ── */}
      {toast && (
        <div
          role="alert"
          className={[
            "feedback-tab__toast",
            `feedback-tab__toast--${toast.type}`,
          ].join(" ")}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Info banner ── */}
      <div className="feedback-tab__info-banner" role="note">
        <span className="feedback-tab__info-icon" aria-hidden="true">💬</span>
        <span className="feedback-tab__info-text">
          Mensagens visíveis pelo paciente.{" "}
          <strong>Use para elogios, orientações e motivação.</strong>
        </span>
      </div>

      {/* ── New feedback button ── */}
      {!isWriting && (
        <button
          className="feedback-tab__new-btn"
          onClick={() => setIsWriting(true)}
        >
          + Nova Mensagem
        </button>
      )}

      {/* ── Compose form ── */}
      {isWriting && (
        <div className="feedback-tab__form">
          <label htmlFor="feedback-textarea" className="sr-only">
            Nova mensagem para o paciente
          </label>
          <textarea
            id="feedback-textarea"
            className="feedback-tab__textarea"
            placeholder={`Ex: Parabéns, ${patient.name.split(" ")[0]}! Você está evoluindo muito bem…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            rows={4}
          />
          <div className="feedback-tab__char-hint">
            {text.length} caractere{text.length !== 1 ? "s" : ""}
          </div>
          <div className="feedback-tab__form-actions">
            <button
              className="feedback-tab__btn feedback-tab__btn--cancel"
              onClick={cancelWriting}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="feedback-tab__btn feedback-tab__btn--save"
              onClick={saveFeedback}
              disabled={saving || !text.trim()}
              aria-busy={saving}
            >
              {saving ? "Enviando…" : "Enviar Mensagem"}
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {feedbacks.length === 0 && !isWriting && (
        <div className="feedback-tab__empty">
          <span className="feedback-tab__empty-icon" aria-hidden="true">📭</span>
          <p>Nenhuma mensagem enviada ainda.</p>
          <p className="feedback-tab__empty-sub">
            Escreva algo motivador para o seu paciente!
          </p>
        </div>
      )}

      {/* ── Feedback list ── */}
      {feedbacks.length > 0 && (
        <div className="feedback-tab__list" aria-label="Mensagens enviadas">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="feedback-tab__card">
              <div className="feedback-tab__card-meta">
                <span className="feedback-tab__card-date">
                  📅 {formatDateTime(fb.created_at)}
                </span>
                <span
                  className={[
                    "feedback-tab__card-badge",
                    fb.read
                      ? "feedback-tab__card-badge--read"
                      : "feedback-tab__card-badge--unread",
                  ].join(" ")}
                >
                  {fb.read ? "Lida ✓" : "Não lida"}
                </span>
              </div>
              <p className="feedback-tab__card-body">{fb.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}