import { useState, useEffect } from "react";
import db from "../../services/db";
import EmptyState from "../../components/ui/EmptyState";
import { formatDateTime } from "../../utils/dates";

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

        // Mark all unread as read
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
    <div style={{ animation: "fadeUp .4s ease", maxWidth: 600 }}>
      <div className="page-header">
        <h2>🔔 Notificações</h2>
        <p>Atividades recentes dos seus pacientes</p>
      </div>

      {loading && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</p>}

      {!loading && notifs.length === 0 && (
        <EmptyState icon="🔕" message="Nenhuma notificação ainda." />
      )}

      {notifs.map((n) => {
        const isDeleted = n.type === "account_deleted";
        const isAlert   = n.exercise_title?.startsWith("🚨");
        return (
          <div
            key={n.id}
            className="card"
            style={{
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: n.read ? 0.65 : 1,
              borderLeft: isDeleted
                ? "3px solid #c0444a"
                : isAlert
                ? "3px solid var(--accent)"
                : undefined,
            }}
          >
            <div style={{ fontSize: 28 }} aria-hidden="true">
              {isDeleted ? "🚪" : isAlert ? "🚨" : "✅"}
            </div>
            <div style={{ flex: 1 }}>
              {isDeleted ? (
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  <strong>{n.patient_name}</strong> encerrou a conta.
                </div>
              ) : (
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  <strong>{n.patient_name}</strong>{" "}
                  {isAlert ? (
                    <span style={{ color: "var(--accent)" }}>{n.exercise_title}</span>
                  ) : (
                    <>concluiu <em>{n.exercise_title}</em></>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {formatDateTime(n.created_at)}
              </div>
            </div>
            {!n.read && (
              <span
                className="response-badge"
                style={{
                  background: isDeleted
                    ? "rgba(192,68,74,0.1)"
                    : "rgba(23,82,124,0.1)",
                  color: isDeleted ? "#c0444a" : "var(--blue-dark)",
                }}
              >
                Novo
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}