// src/features/therapist/PatientModal/FeedbackTab.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import db from "../../../services/db";
import "./FeedbackTab.css";

/* ── Utilitário de som ────────────────────────────────────────
   Coloca /notification.wav na pasta /public do projecto.
   ──────────────────────────────────────────────────────────── */
function playNotificationSound() {
  try {
    const audio = new Audio("/notification.wav");
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("[FeedbackTab] Áudio bloqueado:", e.message));
  } catch (_) {}
}

/* ── Helpers ──────────────────────────────────────────────── */
function formatTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(feedbacks) {
  const result  = [];
  let   lastDay = null;
  const asc = [...feedbacks].reverse();
  for (const fb of asc) {
    const day = new Date(fb.created_at).toDateString();
    if (day !== lastDay) {
      const d         = new Date(fb.created_at);
      const today     = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      let label;
      if      (d.toDateString() === today.toDateString())     label = "Hoje";
      else if (d.toDateString() === yesterday.toDateString()) label = "Ontem";
      else label = d.toLocaleDateString("pt-BR", {
        weekday: "long", day: "numeric", month: "long",
      });
      result.push({ type: "day", label, key: `day-${day}` });
      lastDay = day;
    }
    result.push({ type: "msg", ...fb });
  }
  return result;
}

/**
 * Paciente é considerado online se last_active < 2 minutos atrás.
 * O PatientLayout envia um ping a cada 60s, portanto 2min é uma
 * janela segura para detetar presença real.
 */
function isPatientOnline(lastActive) {
  if (!lastActive) return false;
  return (Date.now() - new Date(lastActive).getTime()) < 2 * 60 * 1000;
}

/* ── ReadCheck (estilo WhatsApp) ──────────────────────────── */
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

/* ── Ícones SVG inline ────────────────────────────────────── */
function IconEdit() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="fb-icon">
      <path d="M14.85 2.85a2 2 0 0 1 2.83 2.83L6.5 16.8l-3.5.7.7-3.5L14.85 2.85Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="fb-icon">
      <path d="M3 5h14M8 5V3h4v2M6 5l1 12h6l1-12"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Indicador de presença do paciente ───────────────────────
   🟢 Online agora  → last_active < 2 minutos
   ⚪ Offline       → caso contrário
   ──────────────────────────────────────────────────────────── */
function PatientPresence({ lastActive }) {
  const online = isPatientOnline(lastActive);
  return (
    <span
      className={`fb-presence ${online ? "fb-presence--online" : "fb-presence--offline"}`}
      aria-label={online ? "Paciente online agora" : "Paciente offline"}
    >
      <span className="fb-presence__dot" aria-hidden="true" />
      {online ? "Online agora" : "Offline"}
    </span>
  );
}

/* ── Bolha de mensagem ────────────────────────────────────── */
function MessageBubble({ item, session, onEdit, onDelete, onError }) {
  const [hovered,    setHovered]    = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [editText,   setEditText]   = useState(item.message);
  const [saving,     setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const editRef = useRef(null);

  const isAuthor = item.therapist_id === session.id;

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [editing]);

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === item.message) { setEditing(false); return; }
    setSaving(true);
    try {
      await db.update(
        "therapist_feedback",
        { id: item.id },
        { message: trimmed, edited: true },
        session.access_token
      );
      onEdit(item.id, trimmed);
      setEditing(false);
    } catch (e) {
      console.error("[FeedbackTab] Erro ao editar:", e.message);
      if (onError) onError("Erro ao editar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
    if (e.key === "Escape") { setEditing(false); setEditText(item.message); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await db.delete("therapist_feedback", { id: item.id }, session.access_token);
      const check = await db.query(
        "therapist_feedback",
        { filter: { id: item.id } },
        session.access_token
      );
      if (Array.isArray(check) && check.length > 0) {
        throw new Error(
          "O Supabase não apagou o registo. " +
          "Verifica se existe a policy RLS de DELETE para therapist_feedback."
        );
      }
      onDelete(item.id);
    } catch (e) {
      console.error("[FeedbackTab] Erro ao deletar:", e.message);
      if (onError) onError("Erro ao excluir: " + e.message);
    } finally {
      setSaving(false);
      setConfirmDel(false);
    }
  };

  return (
    <div
      className="fb-chat__message fb-chat__message--outgoing"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDel(false); }}
      aria-label={`Mensagem enviada às ${formatTime(item.created_at)}`}
    >
      {isAuthor && !editing && (
        <div className={`fb-msg-controls ${hovered ? "fb-msg-controls--visible" : ""}`}>
          <button
            className="fb-msg-btn fb-msg-btn--edit"
            onClick={() => { setEditing(true); setEditText(item.message); }}
            aria-label="Editar mensagem"
            title="Editar"
            disabled={saving}
          >
            <IconEdit />
          </button>

          {confirmDel ? (
            <span className="fb-msg-confirm">
              <button className="fb-msg-btn fb-msg-btn--confirm-yes" onClick={handleDelete} disabled={saving} aria-label="Confirmar exclusão">
                {saving ? "…" : "Excluir"}
              </button>
              <button className="fb-msg-btn fb-msg-btn--confirm-no" onClick={() => setConfirmDel(false)} aria-label="Cancelar">
                Cancelar
              </button>
            </span>
          ) : (
            <button
              className="fb-msg-btn fb-msg-btn--delete"
              onClick={() => setConfirmDel(true)}
              aria-label="Excluir mensagem"
              title="Excluir"
              disabled={saving}
            >
              <IconTrash />
            </button>
          )}
        </div>
      )}

      <div className={`fb-chat__bubble fb-chat__bubble--outgoing ${editing ? "fb-chat__bubble--editing" : ""}`}>
        {editing ? (
          <div className="fb-edit-area">
            <textarea
              ref={editRef}
              className="fb-edit-textarea"
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={handleEditKeyDown}
              rows={1}
              disabled={saving}
              aria-label="Editar texto da mensagem"
            />
            <div className="fb-edit-actions">
              <button className="fb-edit-btn fb-edit-btn--cancel" onClick={() => { setEditing(false); setEditText(item.message); }} disabled={saving}>Cancelar</button>
              <button className="fb-edit-btn fb-edit-btn--save"   onClick={handleSaveEdit} disabled={saving || !editText.trim()}>{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="fb-chat__bubble-text">{item.message}</p>
            <div className="fb-chat__bubble-footer">
              {item.edited && (
                <span className="fb-chat__edited-label" aria-label="Mensagem editada">editada</span>
              )}
              <span className="fb-chat__bubble-time">{formatTime(item.created_at)}</span>
              <ReadCheck read={item.read} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FeedbackTab — componente principal
   ════════════════════════════════════════════════════════════ */
export default function FeedbackTab({ patient, session, feedbacks, onFeedbacksChange }) {
  const [text,       setText]       = useState("");
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [lastActive, setLastActive] = useState(null);

  const inflightRef  = useRef(false);
  const textareaRef  = useRef(null);
  const bottomRef    = useRef(null);
  const presenceRef  = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Presença: busca last_active do paciente a cada 30s ── */
  const fetchPresence = useCallback(async () => {
    try {
      const rows = await db.query(
        "users",
        { filter: { id: patient.id }, select: "last_active" },
        session.access_token
      );
      if (Array.isArray(rows) && rows.length > 0) {
        setLastActive(rows[0].last_active ?? null);
      }
    } catch (_) {}
  }, [patient.id, session.access_token]);

  useEffect(() => {
    fetchPresence();
    presenceRef.current = setInterval(fetchPresence, 30_000);
    return () => clearInterval(presenceRef.current);
  }, [fetchPresence]);

  /* ── Scroll to bottom quando feedbacks mudam ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedbacks.length]);

  /* ── Auto-resize do textarea ── */
  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveFeedback();
    }
  };

  /* ── Enviar mensagem ── */
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

  const handleEdit   = (id, newMessage) => {
    onFeedbacksChange(feedbacks.map((fb) => fb.id === id ? { ...fb, message: newMessage, edited: true } : fb));
    showToast("success", "Mensagem atualizada ✏️");
  };

  const handleDelete = (id) => {
    onFeedbacksChange(feedbacks.filter((fb) => fb.id !== id));
    showToast("success", "Mensagem excluída 🗑️");
  };

  const grouped   = groupByDay(feedbacks);
  const firstName = patient.name.split(" ")[0];

  return (
    <div className="fb-chat">

      {/* ── Toast ── */}
      {toast && (
        <div role="alert" className={`fb-chat__toast fb-chat__toast--${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Banner: info + indicador de presença ── */}
      <div className="fb-chat__banner" role="note">
        <div className="fb-chat__banner-left">
          <span aria-hidden="true">💬</span>
          <span>
            Mensagens visíveis pelo paciente.{" "}
            <strong>Use para elogios, orientações e motivação.</strong>
          </span>
        </div>
        <PatientPresence lastActive={lastActive} />
      </div>

      {/* ── Área de mensagens ── */}
      <div
        className="fb-chat__messages"
        role="log"
        aria-label={`Conversa com ${firstName}`}
        aria-live="polite"
      >
        {feedbacks.length === 0 && (
          <div className="fb-chat__empty" role="status">
            <span aria-hidden="true">📭</span>
            <p>Nenhuma mensagem enviada ainda.</p>
            <p className="fb-chat__empty-sub">Escreva algo motivador para {firstName}!</p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "day") {
            return (
              <div key={item.key} className="fb-chat__day-label">
                <span>{item.label}</span>
              </div>
            );
          }
          return (
            <MessageBubble
              key={item.id}
              item={item}
              session={session}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onError={(msg) => showToast("error", msg)}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Composer ── */}
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
            <IconSend />
          )}
        </button>
      </div>
    </div>
  );
}