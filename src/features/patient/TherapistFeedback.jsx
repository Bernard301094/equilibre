// src/features/patient/TherapistFeedback.jsx
/**
 * Sincronização em tempo real via WebSocket nativo do Supabase Realtime.
 * Zero dependências novas — não usa @supabase/supabase-js.
 *
 * Eventos escutados na tabela therapist_feedback (filtrado por patient_id):
 *   INSERT → nova mensagem aparece instantaneamente
 *   UPDATE → edição reflete imediatamente (incluindo flag "editada")
 *   DELETE → mensagem apagada pelo terapeuta desaparece sem refresh
 *
 * Fallback: polling silencioso a cada 3 min + reconexão ao foco da aba.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import db from "../../services/db";
import "./TherapistFeedback.css";

/* ── Configuração ─────────────────────────────────────────── */
const SUPA_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY
                     ?? import.meta.env.VITE_SUPABASE_KEY;
const POLL_MS      = 3 * 60 * 1000; // polling de segurança: 3 min
const WS_RETRY_MS  = 5_000;          // delay antes de reconectar o WS

/* ── Helpers ──────────────────────────────────────────────── */
function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDayLabel(iso) {
  if (!iso) return "";
  const d         = new Date(iso);
  const today     = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function groupByDay(feedbacks) {
  const result  = [];
  let   lastDay = null;
  const asc = [...feedbacks].reverse(); // lista vem desc → exibir asc
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

/* ── Hook: Realtime via WebSocket nativo ──────────────────── */
/**
 * Conecta ao endpoint Realtime do Supabase sem SDK.
 * Protocolo: Phoenix channels over WebSocket.
 * Reconecta automaticamente se o WS fechar.
 */
function useSupabaseRealtime({ table, patientId, onInsert, onUpdate, onDelete, enabled }) {
  const wsRef        = useRef(null);
  const heartbeatRef = useRef(null);
  const retryRef     = useRef(null);
  const unmountedRef = useRef(false);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!enabled || !SUPA_URL || !SUPA_KEY) return;
    if (unmountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl =
      SUPA_URL.replace(/^https/, "wss").replace(/^http/, "ws") +
      `/realtime/v1/websocket?apikey=${encodeURIComponent(SUPA_KEY)}&vsn=1.0.0`;

    let ws;
    try { ws = new WebSocket(wsUrl); }
    catch (e) { console.error("[Realtime] Falha ao criar WebSocket:", e); return; }
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      setConnected(true);

      /* Entra no canal com filtro por patient_id */
      ws.send(JSON.stringify({
        topic: `realtime:public:${table}:patient_id=eq.${patientId}`,
        event: "phx_join",
        payload: {
          config: {
            broadcast:  { self: false },
            presence:   { key: "" },
            postgres_changes: [
              { event: "INSERT", schema: "public", table, filter: `patient_id=eq.${patientId}` },
              { event: "UPDATE", schema: "public", table, filter: `patient_id=eq.${patientId}` },
              { event: "DELETE", schema: "public", table, filter: `patient_id=eq.${patientId}` },
            ],
          },
        },
        ref: "join-1",
      }));

      /* Heartbeat a cada 25 s */
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb",
          }));
        }
      }, 25_000);
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      const { event, payload } = msg;
      if (!payload?.data) return;

      const { type, record, old_record } = payload.data;
      if (event !== "postgres_changes") return;

      if (type === "INSERT" && record)     onInsert?.(record);
      if (type === "UPDATE" && record)     onUpdate?.(record);
      if (type === "DELETE" && old_record) onDelete?.(old_record);
    };

    ws.onerror = () => {
      /* onclose dispara a seguir e trata a reconexão */
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setConnected(false);
      clearInterval(heartbeatRef.current);
      /* Tenta reconectar após WS_RETRY_MS */
      retryRef.current = setTimeout(connect, WS_RETRY_MS);
    };
  }, [enabled, table, patientId, onInsert, onUpdate, onDelete]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      clearTimeout(retryRef.current);
      clearInterval(heartbeatRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // evita loop de reconexão no unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  return connected;
}

/* ── Componente principal ─────────────────────────────────── */
export default function TherapistFeedback({ session, setView }) {
  const [feedbacks,   setFeedbacks]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const pollingRef = useRef(null);
  const bottomRef  = useRef(null);

  const scrollToBottom = (behavior = "smooth") =>
    bottomRef.current?.scrollIntoView({ behavior });

  /* ── Marca não-lidas como lidas ── */
  const markUnreadAsRead = useCallback(async (unread) => {
    if (!unread.length) return;
    await Promise.all(
      unread.map((fb) =>
        db.update("therapist_feedback", { id: fb.id }, { read: true }, session.access_token)
          .catch(() => {})
      )
    );
  }, [session.access_token]);

  /* ── Carga de dados ── */
  const loadFeedbacks = useCallback(async ({ silent = false } = {}) => {
    if (!session?.therapist_id || !session?.id) { setLoading(false); return; }
    setLoading(true);
    setError("");
    try {
      const rows = await db.query(
        "therapist_feedback",
        { filter: { patient_id: session.id }, order: "created_at.desc" },
        session.access_token
      );
      const list = Array.isArray(rows) ? rows : [];
      setFeedbacks(list);

      const unread = list.filter((fb) => !fb.read);
      if (unread.length) {
        setFeedbacks((prev) => prev.map((fb) => fb.read ? fb : { ...fb, read: true }));
        markUnreadAsRead(unread);
      }
      setTimeout(() => scrollToBottom(silent ? "smooth" : "auto"), 80);
    } catch (e) {
      console.error("[TherapistFeedback]", e);
      setError("Não foi possível carregar as mensagens.");
    } finally {
      setLoading(false);
    }
  }, [session?.id, session?.therapist_id, session?.access_token, markUnreadAsRead]);

  /* ── Callbacks Realtime ── */
  const handleInsert = useCallback((record) => {
    setFeedbacks((prev) => {
      if (prev.some((fb) => fb.id === record.id)) return prev;
      return [record, ...prev]; // lista desc
    });
    db.update("therapist_feedback", { id: record.id }, { read: true }, session.access_token)
      .catch(() => {});
    setTimeout(() => scrollToBottom("smooth"), 60);
  }, [session.access_token]);

  const handleUpdate = useCallback((record) => {
    setFeedbacks((prev) =>
      prev.map((fb) => fb.id === record.id ? { ...fb, ...record } : fb)
    );
  }, []);

  const handleDelete = useCallback((oldRecord) => {
    setFeedbacks((prev) => prev.filter((fb) => fb.id !== oldRecord.id));
  }, []);

  /* ── Realtime hook ── */
  const realtimeOk = useSupabaseRealtime({
    table:     "therapist_feedback",
    patientId: session?.id,
    onInsert:  handleInsert,
    onUpdate:  handleUpdate,
    onDelete:  handleDelete,
    enabled:   !!session?.therapist_id && !!session?.id,
  });

  /* ── Bootstrap ── */
  useEffect(() => {
    if (!session?.therapist_id) { setLoading(false); return; }
    loadFeedbacks();
    pollingRef.current = setInterval(() => loadFeedbacks({ silent: true }), POLL_MS);
    const onFocus = () => loadFeedbacks({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(pollingRef.current);
      window.removeEventListener("focus", onFocus);
    };
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

  const grouped     = groupByDay(feedbacks);
  const unreadCount = feedbacks.filter((fb) => !fb.read).length;

  return (
    <section className="tf-chat" aria-label="Chat com terapeuta">

      {/* ── Topbar ── */}
      <div className="tf-chat__topbar">
        <div className="tf-chat__topbar-avatar" aria-hidden="true">🧑‍⚕️</div>
        <div className="tf-chat__topbar-info">
          <span className="tf-chat__topbar-name">Seu Terapeuta</span>
          <span className={`tf-chat__topbar-status${realtimeOk ? " tf-chat__topbar-status--live" : ""}`}>
            {realtimeOk ? "● Ao vivo" : "Online"}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="tf-chat__badge" aria-label={`${unreadCount} não lidas`}>
            {unreadCount}
          </span>
        )}
      </div>

      {/* ── Mensagens ── */}
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
            <p className="tf-chat__empty-sub">
              Quando ele enviar uma mensagem, ela aparecerá aqui automaticamente.
            </p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === "day") {
            return (
              <div key={item.key} className="tf-chat__day-label"
                aria-label={`Mensagens de ${item.label}`}>
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
                <div className="tf-chat__bubble-meta">
                  {item.edited && (
                    <span className="tf-chat__bubble-edited">editada</span>
                  )}
                  <span className="tf-chat__bubble-time">
                    {formatTime(item.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </section>
  );
}