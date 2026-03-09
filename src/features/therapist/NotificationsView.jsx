import { useState, useEffect } from "react";
import db from "../../services/db";
import EmptyState from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/dates";
import "./NotificationsView.css";

export default function NotificationsView({ session, onRead }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const n = await db.query(
          "notifications",
          { filter: { therapist_id: session.id }, order: "created_at.desc" },
          session.access_token
        );
        const list = Array.isArray(n) ? n : [];
        if (!active) return;
        setNotifs(list);
        const unread = list.filter((x) => !x.read);
        await Promise.allSettled(
          unread.map((notif) =>
            db.update("notifications", { id: notif.id }, { read: true }, session.access_token)
          )
        );
        onRead?.();
      } catch (e) {
        console.error("[NotificationsView]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-fade-in nv-wrapper">
      <div className="page-header">
        <h2>🔔 Notificações</h2>
        <p>Atividades recentes dos seus pacientes</p>
      </div>

      {loading && <p className="nv-loading">Carregando...</p>}

      {!loading && notifs.length === 0 && (
        <EmptyState icon="🔕" message="Nenhuma notificação ainda." />
      )}

      <div className="nv-list">
        {notifs.map((n) => {
          const isDeleted = n.type === "account_deleted";
          const isAlert   = n.exercise_title?.startsWith("🚨");

          return (
            <div
              key={n.id}
              className={[
                "card",
                "nv-item",
                n.read    ? "nv-item--read"    : "",
                isDeleted ? "nv-item--deleted"  : "",
                isAlert   ? "nv-item--alert"    : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="nv-item__icon" aria-hidden="true">
                {isDeleted ? "🚪" : isAlert ? "🚨" : "✅"}
              </div>

              <div className="nv-item__body">
                {isDeleted ? (
                  <div className="nv-item__text">
                    <strong>{n.patient_name}</strong> encerrou a conta.
                  </div>
                ) : (
                  <div className="nv-item__text">
                    <strong>{n.patient_name}</strong>{" "}
                    {isAlert ? (
                      <span className="nv-item__alert-title">{n.exercise_title}</span>
                    ) : (
                      <>concluiu <em>{n.exercise_title}</em></>
                    )}
                  </div>
                )}
                <div className="nv-item__date">
                  {formatDateTime(n.created_at)}
                </div>
              </div>

              {!n.read && (
                <span className={`nv-badge${isDeleted ? " nv-badge--deleted" : " nv-badge--new"}`}>
                  Novo
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}