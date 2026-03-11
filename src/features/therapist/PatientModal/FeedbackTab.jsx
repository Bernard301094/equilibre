// src/components/therapist/tabs/FeedbackTab.jsx
import { useState, useRef, useEffect } from "react";
import db from "../../../services/db";
import { formatDateTime } from "../../../utils/dates";
import "./FeedbackTab.css";

/** Formata apenas o horário curto para a bolha */
function formatTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Agrupa mensagens por dia — igual ao lado do paciente */
function groupByDay(feedbacks) {
  const result = [];
  let lastDay = null;
  const asc = [...feedbacks].reverse(); // feedbacks vêm desc → exibir asc
  for (const fb of asc) {
    const day = new Date(fb.created_at).toDateString();
    if (day !== lastDay) {
      const d = new Date(fb.created_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      let label;
      if (d.toDateString() === today.toDateString()) label = "Hoje";
      else if (d.toDateString() === yesterday.toDateString()) label = "Ontem";
      else label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
      result.push({ type: "day", label, key: `day-${day}` });
      lastDay = day;
    }
    result.push({ type: "msg", ...fb });
  }
  return result;
}

/**
 * CheckMark — sistema visual de leitura estilo WhatsApp
 *   ✓   cinza  → enviado (não lido)
 *   ✓✓  azul   → lido
 */
function ReadCheck({ read }) {
  return (
    <span
      className={`fb-check ${read ? "fb-check--read" : "fb-check--sent"}`}
      aria-label={read ? "Lida" : "Enviada, não lida"}
    >
      {read ? "✓✓" : "✓"}
    </span>
  );
}

export default function FeedbackTab({ patient, session, feedbacks, onFeedbacksChange }) {
  const [text,   setText]   = useState("");
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);
  const inflightRef = useRef(false);
  const textareaRef = useRef(null);
  const bottomRef   = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* Scroll to bottom quando feedbacks mudam */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedbacks]);

  /* Auto-resize do textarea */
  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  /* Enviar com Enter (Shift+Enter = nova linha) */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveFeedback();
    }
  };

  const saveFeedback = async () => {
    if (!text.trim() || inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    try {
      const payload = {
        patient_id:   patient.id,
        therapist_id: session.id,
        message:      text.trim(),
        read:         false,
      };
      const saved = await db.insert("therapist_feedback", payload, session.access_token);
      if (!saved?.id) throw new Error(
        "Insert bloqueado. patient_id=" + payload.patient_id +
        " therapist_id=" + payload.therapist_id
      );
      onFeedbacksChange([saved, ...feedbacks]);
      setText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      showToast("success", "Mensagem enviada ✅");
    } catch (e) {
      console.error("[FeedbackTab] Erro:", e.message);
      showToast("error", "Erro: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  const grouped = groupByDay(feedbacks);
  const firstName = patient.name.split(" ")[0];

  return (
    <div className="fb-chat">

      {/* ── Toast ── */}
      {toast && (
        <div
          role="alert"
          className={`fb-chat__toast fb-chat__toast--${toast.type}`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Info banner ── */}
      <div className="fb-chat__banner" role="note">
        <span aria-hidden="true">💬</span>
        <span>
          Mensagens visíveis pelo paciente.{" "}
          <strong>Use para elogios, orientações e motivação.</strong>
        </span>
      </div>

      {/* ── Área de mensagens (scrollável) ── */}
      <div
        className="fb-chat__messages"
        role="log"
        aria-label={`Conversa com ${firstName}`}
        aria-live="polite"
      >
        {/* Estado vazio */}
        {feedbacks.length === 0 && (
          <div className="fb-chat__empty" role="status">
            <span aria-hidden="true">📭</span>
            <p>Nenhuma mensagem enviada ainda.</p>
            <p className="fb-chat__empty-sub">
              Escreva algo motivador para {firstName}!
            </p>
          </div>
        )}

        {/* Mensagens agrupadas por dia */}
        {grouped.map((item) => {
          if (item.type === "day") {
            return (
              <div key={item.key} className="fb-chat__day-label">
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="fb-chat__message fb-chat__message--outgoing"
              aria-label={`Você enviou às ${formatTime(item.created_at)}`}
            >
              <div className="fb-chat__bubble fb-chat__bubble--outgoing">
                <p className="fb-chat__bubble-text">{item.message}</p>
                <div className="fb-chat__bubble-footer">
                  <span className="fb-chat__bubble-time">
                    {formatTime(item.created_at)}
                  </span>
                  <ReadCheck read={item.read} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Âncora de scroll */}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer fixo na parte inferior ── */}
      <div className="fb-chat__composer" role="form" aria-label="Escrever mensagem">
        <textarea
          ref={textareaRef}
          className="fb-chat__input"
          placeholder={`Mensagem para ${firstName}…`}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={saving}
          aria-label="Texto da mensagem"
        />
        <button
          className="fb-chat__send-btn"
          onClick={saveFeedback}
          disabled={saving || !text.trim()}
          aria-label="Enviar mensagem"
          aria-busy={saving}
        >
          {saving ? (
            <span className="fb-chat__send-spinner" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}