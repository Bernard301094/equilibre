// src/components/patient/TherapistFeedback.jsx
import { useState, useEffect, useCallback } from "react";
import db from "../../services/db";
import { formatDateTime } from "../../utils/dates";
import "./TherapistFeedback.css";

/**
 * TherapistFeedback
 * Exibido na visão do paciente.
 * Busca todas as mensagens escritas pelo terapeuta vinculado
 * e marca as não-lidas como lidas automaticamente.
 */
export default function TherapistFeedback({ session }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  /* ── Fetch + auto-mark-as-read ── */
  const loadFeedbacks = useCallback(async () => {
    // CORREÇÃO: guard aprimorado com log de diagnóstico
    if (!session?.therapist_id) {
      console.warn(
        "[TherapistFeedback] Abortando: session.therapist_id está ausente.\n" +
        "Verifique se hydrateSession() foi chamado após o login.\n" +
        "session atual:", session
      );
      setLoading(false);
      return;
    }

    if (!session?.id) {
      console.warn("[TherapistFeedback] Abortando: session.id (patient_id) está ausente.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const rows = await db.query(
        "therapist_feedback",
        {
          filter: {
            patient_id:   session.id,
            therapist_id: session.therapist_id,
          },
          order: "created_at.desc",
        },
        session.access_token
      );

      const list = Array.isArray(rows) ? rows : [];
      setFeedbacks(list);

      // Marca não-lidas como lidas (fire-and-forget, não bloqueia a UI)
      const unread = list.filter((fb) => !fb.read);
      if (unread.length > 0) {
        unread.forEach((fb) => {
          db.update(
            "therapist_feedback",
            { id: fb.id },
            { read: true },
            session.access_token
          ).catch((e) => {
            // Não é crítico, mas loga para detectar falhas de RLS
            console.warn("[TherapistFeedback] Falha ao marcar feedback como lido:", e.message);
          });
        });
        // Atualização otimista local
        setFeedbacks((prev) =>
          prev.map((fb) => (!fb.read ? { ...fb, read: true } : fb))
        );
      }
    } catch (e) {
      console.error("[TherapistFeedback] Erro ao carregar mensagens:", e);
      setError("Não foi possível carregar as mensagens.");
    } finally {
      setLoading(false);
    }
  }, [session?.id, session?.therapist_id, session?.access_token]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  /* ── Sem terapeuta vinculado: não renderiza nada ── */
  if (!session?.therapist_id) return null;

  /* ── Carregando ── */
  if (loading) {
    return (
      <section className="tf-section" aria-label="Mensagens do terapeuta">
        <h2 className="tf-section__title">💬 Mensagens do Terapeuta</h2>
        <div className="tf-loading" aria-live="polite">
          <span className="tf-loading__spinner" aria-hidden="true" />
          Carregando mensagens…
        </div>
      </section>
    );
  }

  /* ── Erro ── */
  if (error) {
    return (
      <section className="tf-section" aria-label="Mensagens do terapeuta">
        <h2 className="tf-section__title">💬 Mensagens do Terapeuta</h2>
        <div className="tf-error" role="alert">
          <span aria-hidden="true">⚠️</span> {error}
          <button className="tf-retry-btn" onClick={loadFeedbacks}>
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  /* ── Sem mensagens ainda ── */
  if (feedbacks.length === 0) {
    return (
      <section className="tf-section" aria-label="Mensagens do terapeuta">
        <h2 className="tf-section__title">💬 Mensagens do Terapeuta</h2>
        <div className="tf-empty">
          <span className="tf-empty__icon" aria-hidden="true">📭</span>
          <p>Ainda não há mensagens do seu terapeuta.</p>
        </div>
      </section>
    );
  }

  const unreadCount = feedbacks.filter((fb) => !fb.read).length;

  return (
    <section className="tf-section" aria-label="Mensagens do terapeuta">
      <div className="tf-section__header">
        <h2 className="tf-section__title">
          💬 Mensagens do Terapeuta
        </h2>
        {unreadCount > 0 && (
          <span
            className="tf-unread-badge"
            aria-label={`${unreadCount} não lidas`}
          >
            {unreadCount} nova{unreadCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="tf-list" aria-label="Mensagens recebidas">
        {feedbacks.map((fb, index) => (
          <article
            key={fb.id}
            className={[
              "tf-card",
              index === 0 && !fb.read ? "tf-card--highlight" : "",
            ].filter(Boolean).join(" ")}
            aria-label={`Mensagem de ${formatDateTime(fb.created_at)}`}
          >
            {/* Ponto indicador de não-lida */}
            {!fb.read && (
              <span className="tf-card__unread-dot" aria-label="Não lida" />
            )}

            <div className="tf-card__avatar" aria-hidden="true">
              🧑‍⚕️
            </div>

            <div className="tf-card__content">
              <div className="tf-card__meta">
                <span className="tf-card__author">Seu Terapeuta</span>
                <span className="tf-card__date">
                  {formatDateTime(fb.created_at)}
                </span>
              </div>
              <p className="tf-card__message">{fb.message}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}