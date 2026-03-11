// src/features/patient/TherapistFeedback.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import db from "../../services/db";
import "./TherapistFeedback.css";

/* ── Configuração ─────────────────────────────────────────── */
const SUPA_URL    = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY
                    ?? import.meta.env.VITE_SUPABASE_KEY;
const POLL_MS     = 3 * 60 * 1000;
const WS_RETRY_MS = 5_000;

/* ── Helpers de formatação ────────────────────────────────── */
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

/* ── Avatar inline (sem dependência externa) ──────────────── */
function TherapistAvatar({ name, avatarUrl }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "T")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Terapeuta"}
        className="tf-chat__topbar-avatar tf-chat__topbar-avatar--img"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="tf-chat__topbar-avatar tf-chat__topbar-avatar--initials" aria-hidden="true">
      {initials}
    </div>
  );
}

/* ── Hook: Realtime via WebSocket nativo ──────────────────── */
function useSupabaseRealtime({ table, patientId, onInsert, onUpdate, onDelete, enabled }) {
  const wsRef        = useRef(null);
  const heartbeatRef = useRef(null);
  const retryRef     = useRef(null);
  const unmountedRef = useRef(false);

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

      ws.send(JSON.stringify({
        topic: `realtime:public:${table}:patient_id=eq.${patientId}`,
        event: "phx_join",
        payload: {
          config: {
            broadcast: { self: false },
            presence:  { key: "" },
            postgres_changes: [
              { event: "INSERT", schema: "public", table, filter: `patient_id=eq.${patientId}` },
              { event: "UPDATE", schema: "public", table, filter: `patient_id=eq.${patientId}` },
              { event: "DELETE", schema: "public", table, filter: `patient_id=eq.${patientId}` },
            ],
          },
        },
        ref: "join-1",
      }));

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
      if (!payload?.data || event !== "postgres_changes") return;
      const { type, record, old_record } = payload.data;
      if (type === "INSERT" && record)     onInsert?.(record);
      if (type === "UPDATE" && record)     onUpdate?.(record);
      if (type === "DELETE" && old_record) onDelete?.(old_record);
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      if (unmountedRef.current) return;
      clearInterval(heartbeatRef.current);
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
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);
}

/* ── Componente principal ─────────────────────────────────── */
export default function TherapistFeedback({ session, setView }) {
  const [feedbacks,        setFeedbacks]        = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [therapistProfile, setTherapistProfile] = useState(null);

  const pollingRef = useRef(null);
  const bottomRef  = useRef(null);

  const scrollToBottom = (behavior = "smooth") =>
    bottomRef.current?.scrollIntoView({ behavior });

  /* ── Busca nome e avatar reais do terapeuta ── */
  useEffect(() => {
    if (!session?.therapist_id || !session?.access_token) return;
    db.query(
      "users",
      { filter: { id: session.therapist_id }, select: "id,name,avatar_url" },
      session.access_token
    )
      .then((rows) => {
        if (Array.isArray(rows) && rows.length > 0) setTherapistProfile(rows[0]);
      })
      .catch(() => {});
  }, [session?.therapist_id, session?.access_token]);

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

  /* ── Carga de mensagens ── */
  const loadFeedbacks = useCallback(async ({ silent = false } = {}) => {
    if (!session?.therapist_id || !session?.id) { setLoading(false); return; }
    if (!silent) setLoading(true);
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
      return [record, ...prev];
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
  useSupabaseRealtime({
    table:     "therapist_feedback",
    patientId: session?.id,
    onInsert:  handleInsert,
    onUpdate:  handleUpdate,
    onDelete:  handleDelete,
    enabled:   !!session?.therapist_id && !!session?.id,
  });

  /* ── Bootstrap + polling de segurança ── */
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

  /* ── Estado: sem terapeuta vinculado ── */
  if (!session?.therapist_id) {
    return (
      <section className="tf-chat" aria-label="Mensagens do terapeuta">
        <div className="tf-chat__topbar">
          <div className="tf-chat__topbar-avatar tf-chat__topbar-avatar--initials" aria-hidden="true">
            🧑‍⚕️
          </div>
          <div className="tf-chat__topbar-info">
            <span className="tf-chat__topbar-name">Seu Terapeuta</span>
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
  const therapistName = therapistProfile?.name ?? "Seu Terapeuta";

  return (
    <section className="tf-chat" aria-label="Chat com terapeuta">

      {/* ── Topbar com foto e nome reais ── */}
      <div className="tf-chat__topbar">
        <TherapistAvatar
          name={therapistName}
          avatarUrl={therapistProfile?.avatar_url ?? null}
        />
        <div className="tf-chat__topbar-info">
          <span className="tf-chat__topbar-name">{therapistName}</span>
          <span className="tf-chat__topbar-sub">Profissional de saúde</span>
        </div>
        {unreadCount > 0 && (
          <span className="tf-chat__badge" aria-label={`${unreadCount} não lidas`}>
            {unreadCount}
          </span>
        )}
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