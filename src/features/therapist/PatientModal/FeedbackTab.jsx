import { useState, useRef } from "react";
import db from "../../../services/db";
import { formatDateTime } from "../../../utils/dates";
import "./FeedbackTab.css";

export default function FeedbackTab({ patient, session, feedbacks, onFeedbacksChange }) {
  const [isWriting, setIsWriting] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const inflightRef = useRef(false);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };
  const cancelWriting = () => { setIsWriting(false); setText(""); };

  const saveFeedback = async () => {
    console.log("[FeedbackTab] saveFeedback chamado", { text: text.trim(), patientId: patient?.id, therapistId: session?.id });
    if (!text.trim() || inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    try {
      const payload = { patient_id: patient.id, therapist_id: session.id, message: text.trim(), read: false };
      console.log("[FeedbackTab] Payload:", JSON.stringify(payload));
      const saved = await db.insert("therapist_feedback", payload, session.access_token);
      console.log("[FeedbackTab] Resposta:", JSON.stringify(saved));
      if (!saved?.id) throw new Error("Insert bloqueado. patient_id=" + payload.patient_id + " therapist_id=" + payload.therapist_id);
      onFeedbacksChange([saved, ...feedbacks]);
      setText(""); setIsWriting(false);
      showToast("success", "Feedback enviado! ✅");
    } catch (e) {
      console.error("[FeedbackTab] Erro:", e.message);
      showToast("error", "Erro: " + e.message);
    } finally { setSaving(false); inflightRef.current = false; }
  };

  return (
    <div className="feedback-tab">
      {toast && <div role="alert" className={"feedback-tab__toast feedback-tab__toast--" + toast.type}>{toast.msg}</div>}
      <div className="feedback-tab__info-banner" role="note">
        <span aria-hidden="true">💬</span>
        <span> Mensagens visíveis pelo paciente. <strong>Use para elogios, orientações e motivação.</strong></span>
      </div>
      {!isWriting && <button className="feedback-tab__new-btn" onClick={() => setIsWriting(true)}>+ Nova Mensagem</button>}
      {isWriting && (
        <div className="feedback-tab__form">
          <textarea id="feedback-textarea" className="feedback-tab__textarea"
            placeholder={"Ex: Parabéns, " + patient.name.split(" ")[0] + "! Você está evoluindo muito bem…"}
            value={text} onChange={(e) => setText(e.target.value)} autoFocus rows={4} />
          <div className="feedback-tab__char-hint">{text.length} caractere{text.length !== 1 ? "s" : ""}</div>
          <div className="feedback-tab__form-actions">
            <button className="feedback-tab__btn feedback-tab__btn--cancel" onClick={cancelWriting} disabled={saving}>Cancelar</button>
            <button className="feedback-tab__btn feedback-tab__btn--save" onClick={saveFeedback} disabled={saving || !text.trim()} aria-busy={saving}>
              {saving ? "Enviando…" : "Enviar Mensagem"}
            </button>
          </div>
        </div>
      )}
      {feedbacks.length === 0 && !isWriting && (
        <div className="feedback-tab__empty">
          <span aria-hidden="true">📭</span>
          <p>Nenhuma mensagem enviada ainda.</p>
          <p className="feedback-tab__empty-sub">Escreva algo motivador para o seu paciente!</p>
        </div>
      )}
      {feedbacks.length > 0 && (
        <div className="feedback-tab__list">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="feedback-tab__card">
              <div className="feedback-tab__card-meta">
                <span className="feedback-tab__card-date">📅 {formatDateTime(fb.created_at)}</span>
                <span className={"feedback-tab__card-badge feedback-tab__card-badge--" + (fb.read ? "read" : "unread")}>
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
