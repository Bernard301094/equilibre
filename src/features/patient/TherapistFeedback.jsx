// src/components/patient/TherapistFeedback.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import db from "../../services/db";
import { formatDateTime } from "../../utils/dates";
import "./TherapistFeedback.css";

const POLL_INTERVAL_MS = 2 * 60 * 1000;

/** Formata apenas o horário curto para a bolha de chat */
function formatTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formata a data do separador de dia */
function formatDayLabel(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Agrupa as mensagens inserindo separadores de data quando o dia muda.
 * Retorna um array misto: { type: 'day', label } | { type: 'msg', ...fb }
 */
function groupByDay(feedbacks) {
  const result = [];
  let lastDay = null;
  // feedbacks vêm desc → invertemos para exibir cronologicamente
  const asc = [...feedbacks].reverse();
  for (const fb of asc) {
    const day = new Date(fb.created_at).toDateString();
    if (day !== lastDay) {
      result.push({ type: "day", label: formatDayLabel(fb.created_at), key: `day-${day}` });
      lastDay = day;
    }
    result.push({ type: "msg", ...fb });
  }
  return result;
}

export default function TherapistFeedback({ session, setView }) {
  const [feedbacks,   setFeedbacks]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollingRef  = useRef(null);
  const bottomRef   = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  const markUnreadAsRead = useCallback(async (unreadList, accessToken) => {
    if (unreadList.length === 0) return;
    const results = await Promise.all(
      unreadList.map((fb) =>
        db.update("therapist_feedback", { id: fb.id }, { read: true }, accessToken)
          .catch((e) => {
            console.warn(`[TherapistFeedback] Falha ao marcar ${fb.id}:`, e.message);
            return null;
          })
      )
    );
    const failed = results.filter((r) => r === null).length;
    if (failed > 0) console.warn(`[TherapistFeedback] ${failed}/${unreadList.length} updates falharam.`);
  }, []);

  const loadFeedbacks = useCallback(
    async ({ silent = false } = {}) => {
      if (!session?.therapist_id || !session?.id) { setLoading(false); return; }
      silent ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const rows = await db.query(
          "therapist_feedback",
          { filter: { patient_id: session.id }, order: "created_at.desc" },
          session.access_token
        );
        const list = Array.isArray(rows) ? rows : [];
        setFeedbacks(list);
        setLastUpdated(new Date());
        const unread = list.filter((fb) => !fb.read);
        if (unread.length > 0) {
          setFeedbacks((prev) => prev.map((fb) => (!fb.read ? { ...fb, read: true } : fb)));
          markUnreadAsRead(unread, session.access_token);
        }
        // Scroll após atualização
        setTimeout(() => scrollToBottom(silent ? "smooth" : "auto"), 80);
      } catch (e) {
        console.error("[TherapistFeedback] Erro:", e);
        setError("Não foi possível carregar as mensagens.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.id, session?.therapist_id, session?.access_token, markUnreadAsRead]
  );

  useEffect(() => {
    loadFeedbacks();
    if (session?.therapist_id) {
      pollingRef.current = setInterval(() => loadFeedbacks({ silent: true }), POLL_INTERVAL_MS);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [loadFeedbacks, session?.therapist_id]);

  /* ── Sem terapeuta vinculado ── */
  if (!session?.therapist_id) {
    return (
      <section className="tf-chat" aria-label="Mensagens do terapeuta">
        <div className="tf-chat__topbar">
          <div className="tf-chat__topbar-avatar" aria-hidden="true">🧑‍⚕️</div>
          <div className="tf-chat__topbar-info">
            <span className="tf-chat__topbar-name">Seu Terapeuta</span>
            <span className="tf-chat__topbar-status">Nenhum profissional vinculado</span>
          </div>
        </div>
        <div className="tf-chat__body tf-chat__body--centered">
          <div className="tf-empty-state" role="status">
            <span className="tf-empty-state__icon" aria-hidden="true">🔗</span>
            <p className="tf-empty-state__title">Nenhum profissional vinculado</p>
            <p className="tf-empty-state__desc">
              Insira o seu código de convite para começar a receber mensagens.
            </p>
            {typeof setView === "function" && (
              <button className="tf-empty-state__btn" onClick={() => setView("home")}>
                🏠 Ir para o início
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const grouped = groupByDay(feedbacks);
  const unreadCount = feedbacks.filter((fb) => !fb.read).length;

  return (
    <section className="tf-chat" aria-label="Chat com terapeuta">

      {/* ── Topbar estilo messenger ── */}
      <div className="tf-chat__topbar">
        <div className="tf-chat__topbar-avatar" aria-hidden="true">🧑‍⚕️</div>
        <div className="tf-chat__topbar-info">
          <span className="tf-chat__topbar-name">Seu Terapeuta</span>
          <span className="tf-chat__topbar-status">
            {refreshing ? "Atualizando…" : "Online"}
          </span>
        </div>
        <div className="tf-chat__topbar-actions">
          {unreadCount > 0 && (
            <span className="tf-chat__badge" aria-label={`${unreadCount} não lidas`}>
              {unreadCount}
            </span>
          )}
          <button
            className="tf-chat__refresh-btn"
            onClick={() => loadFeedbacks({ silent: true })}
            disabled={refreshing}
            aria-label="Atualizar mensagens"
            title={lastUpdated ? `Atualizado: ${formatDateTime(lastUpdated.toISOString())}` : "Atualizar"}
          >
            {refreshing ? "⏳" : "🔄"}
          </button>
        </div>
      </div>

      {/* ── Área de mensagens ── */}
      <div className="tf-chat__body" role="log" aria-live="polite" aria-label="Mensagens">

        {loading && (
          <div className="tf-chat__loader">
            <span className="tf-chat__loader-dot" />
            <span className="tf-chat__loader-dot" />
            <span className="tf-chat__loader-dot" />
          </div>
        )}

        {error && (
          <div className="tf-chat__error" role="alert">
            <span>⚠️ {error}</span>
            <button onClick={() => loadFeedbacks()}>Tentar novamente</button>
          </div>
        )}

        {!loading && !error && feedbacks.length === 0 && (
          <div className="tf-chat__empty" role="status">
            <span aria-hidden="true">💬</span>
            <p>Ainda não há mensagens do seu terapeuta.</p>
            <p className="tf-chat__empty-sub">Quando ele enviar uma mensagem, ela aparecerá aqui.</p>
          </div>
        )}

        {/* Mensagens agrupadas por dia */}
        {grouped.map((item) => {
          if (item.type === "day") {
            return (
              <div key={item.key} className="tf-chat__day-label" aria-label={`Mensagens de ${item.label}`}>
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="tf-chat__message tf-chat__message--incoming"
              aria-label={`Mensagem de ${formatTime(item.created_at)}`}
            >
              <div className="tf-chat__bubble tf-chat__bubble--incoming">
                <p className="tf-chat__bubble-text">{item.message}</p>
                <span className="tf-chat__bubble-time">{formatTime(item.created_at)}</span>
              </div>
            </div>
          );
        })}

        {/* Âncora de scroll */}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}