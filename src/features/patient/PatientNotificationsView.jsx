import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import db          from "../../services/db";
import EmptyState  from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/dates";
import "../therapist/NotificationsView.css"; // reutiliza o CSS do terapeuta

/* ════════════════════════════════════════════════════════════
   PatientNotificationsView
   Agrega mensagens não lidas (therapist_feedback) +
   exercícios pendentes (assignments) numa lista unificada.
   ════════════════════════════════════════════════════════════ */
export default function PatientNotificationsView() {
  const { session, navigateTo } = useOutletContext();

  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        /* ── 1. Mensagens não lidas do terapeuta ── */
        const feedbackRaw = await db.query(
          "therapist_feedback",
          { filter: { patient_id: session.id, read: false }, order: "created_at.desc" },
          session.access_token
        ).catch(() => []);

        const feedbackList = (Array.isArray(feedbackRaw) ? feedbackRaw : []).map((f) => ({
          id:          `feedback-${f.id}`,
          _raw_id:     f.id,
          type:        "feedback",
          icon:        "💬",
          title:       "Nova mensagem do terapeuta",
          description: f.message ?? f.content ?? "",
          date:        f.created_at,
          read:        false,
        }));

        /* ── 2. Exercícios pendentes ── */
        const assignRaw = await db.query(
          "assignments",
          { filter: { patient_id: session.id, status: "pending" }, order: "created_at.desc" },
          session.access_token
        ).catch(() => []);

        const assignList = (Array.isArray(assignRaw) ? assignRaw : []).map((a) => ({
          id:          `assign-${a.id}`,
          _raw_id:     a.id,
          type:        "assignment",
          icon:        "📋",
          title:       "Exercício pendente",
          description: a.exercise_title ?? a.title ?? "Exercício sem título",
          date:        a.due_date ?? a.created_at,
          read:        false, // pendentes são sempre "novos"
        }));

        if (!active) return;

        /* ── 3. Junta e ordena por data decrescente ── */
        const merged = [...feedbackList, ...assignList].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        setNotifs(merged);

        /* ── 4. Marca mensagens do terapeuta como lidas ── */
        const unreadFeedback = feedbackList.map((f) => f._raw_id);
        await Promise.allSettled(
          unreadFeedback.map((fid) =>
            db.update("therapist_feedback", { id: fid }, { read: true }, session.access_token)
          )
        );
      } catch (e) {
        console.error("[PatientNotificationsView]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [session.id, session.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (notif) => {
    if (notif.type === "feedback")   navigateTo("chat");       // abre o TherapistFeedback
    if (notif.type === "assignment") navigateTo("exercises");  // abre a lista de exercícios
  };

  return (
    <div className="page-fade-in nv-wrapper">

      <div className="page-header">
        <h2>🔔 Notificações</h2>
        <p>As suas mensagens e exercícios pendentes</p>
      </div>

      {loading && <p className="nv-loading">Carregando...</p>}

      {!loading && notifs.length === 0 && (
        <EmptyState icon="🔕" message="Nenhuma notificação de momento." />
      )}

      <div className="nv-list">
        {notifs.map((n) => (
          <div
            key={n.id}
            className={[
              "card",
              "nv-item",
              "nv-item--clickable",
              n.read ? "nv-item--read" : "",
            ].filter(Boolean).join(" ")}
            role="button"
            tabIndex={0}
            aria-label={`${n.title}: ${n.description}`}
            onClick={() => handleClick(n)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick(n);
              }
            }}
          >
            <div className="nv-item__icon" aria-hidden="true">
              {n.icon}
            </div>

            <div className="nv-item__body">
              <div className="nv-item__text">
                <strong>{n.title}</strong>
                {n.description ? <> — <em>{n.description}</em></> : null}
              </div>
              <div className="nv-item__date">
                {formatDateTime(n.date)}
              </div>
            </div>

            {!n.read && (
              <span className="nv-badge nv-badge--new">Novo</span>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}