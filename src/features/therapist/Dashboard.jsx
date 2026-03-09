import { useState, useEffect } from "react";
import db from "../../services/db";
import { calcStreak, localDateOffset, isOverdue } from "../../utils/dates";
import { getPlantStage } from "../../utils/constants";
import { SkeletonDashboard } from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";
import "./Dashboard.css";

const getGreeting = (name) => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return `Bom dia, ${name} ☀️`;
  if (h >= 12 && h < 18) return `Boa tarde, ${name} 🌤️`;
  if (h >= 18 && h < 22) return `Boa noite, ${name} 🌙`;
  return `Olá, ${name} 🌙`;
};

const getGreetingSub = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Veja o que há de novo com os seus pacientes hoje.";
  if (h >= 12 && h < 18) return "Como está a evolução dos seus pacientes esta tarde?";
  if (h >= 18 && h < 22) return "Encerrando o dia? Confira os últimos registos dos seus pacientes.";
  return "Trabalhando tarde? Lembre-se de cuidar de si também.";
};

export default function TherapistDashboard({ session, setView }) {
  const [stats,    setStats]    = useState({ patients: 0, done: 0, pending: 0, recent: [] });
  const [redFlags, setRedFlags] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const patientsRaw = await db.query(
          "users",
          { filter: { therapist_id: session.id, role: "patient" } },
          session.access_token
        );

        const pList = Array.isArray(patientsRaw)
          ? patientsRaw
          : patientsRaw && typeof patientsRaw === "object"
          ? [patientsRaw]
          : [];

        const pIds = pList.map((p) => p.id);

        const [allAssign, diaryRows, respRows] = pIds.length > 0
          ? await Promise.all([
              db.query(
                "assignments",
                { filterIn: { patient_id: pIds }, select: "id,patient_id,status,due_date" },
                session.access_token
              ).then((r) => Array.isArray(r) ? r : r && typeof r === "object" ? [r] : [])
               .catch(() => []),
              db.query(
                "diary_entries",
                { filterIn: { patient_id: pIds }, select: "patient_id,date" },
                session.access_token
              ).catch(() => []),
              db.query(
                "responses",
                { filterIn: { patient_id: pIds }, select: "patient_id,completed_at" },
                session.access_token
              ).catch(() => []),
            ])
          : [[], [], []];

        if (!active) return;

        /* ── Red Flags ── */
        const threeDaysAgo = localDateOffset(3);
        const flags = [];

        for (const p of pList) {
          const diaryDates = (Array.isArray(diaryRows) ? diaryRows : [])
            .filter((d) => d.patient_id === p.id)
            .map((d) => d.date);

          const respDates = (Array.isArray(respRows) ? respRows : [])
            .filter((r) => r.patient_id === p.id)
            .map((r) => r.completed_at?.slice(0, 10))
            .filter(Boolean);

          const allDates   = [...diaryDates, ...respDates];
          const lastDate   = allDates.sort().reverse()[0] ?? null;
          const isInactive = !lastDate || lastDate < threeDaysAgo;

          const patientPending = allAssign.filter((a) => a.patient_id === p.id && a.status === "pending");
          const overdueCount   = patientPending.filter((a) => isOverdue(a.due_date)).length;
          const hasHighOverdue = overdueCount >= 3;

          if (isInactive || hasHighOverdue) {
            const streak = calcStreak(allDates);
            const stage  = getPlantStage(streak);
            flags.push({
              patient: p,
              isInactive,
              hasHighOverdue,
              overdueCount,
              lastDate,
              streak,
              stage,
              daysSinceActivity: lastDate
                ? Math.floor((new Date() - new Date(lastDate + "T12:00:00")) / 86_400_000)
                : null,
            });
          }
        }

        setStats({
          patients: pIds.length,
          done:     allAssign.filter((a) => a.status === "done").length,
          pending:  allAssign.filter((a) => a.status === "pending").length,
          recent:   pList.slice(0, 4),
        });
        setRedFlags(flags);
      } catch (e) {
        console.error("[Dashboard]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [session.id, session.access_token]);

  if (loading) return <SkeletonDashboard />;

  const firstName = session.name.split(" ")[0];

  return (
    <div className="dashboard page-fade-in">

      {/* ── Header ── */}
      <div className="dashboard__header">
        <h2 className="dashboard__greeting">{getGreeting(firstName)}</h2>
        <p className="dashboard__greeting-sub">{getGreetingSub()}</p>
      </div>

      {/* ── Stats ── */}
      <div className="dashboard__stats-grid">
        <StatCard icon="👥" value={stats.patients} label="Pacientes ativos"      />
        <StatCard icon="✅" value={stats.done}     label="Exercícios concluídos" />
        <StatCard icon="⏳" value={stats.pending}  label="Pendentes"             />
      </div>

      {/* ── Red Flags ── */}
      {redFlags.length > 0 && (
        <div className="dashboard__flags-card">
          <div className="dashboard__flags-header">
            <span className="dashboard__flags-icon" aria-hidden="true">🚨</span>
            <div>
              <h3 className="dashboard__flags-title">Alertas de Atenção</h3>
              <p className="dashboard__flags-sub">
                {redFlags.length} paciente{redFlags.length > 1 ? "s" : ""} precisam da sua atenção
              </p>
            </div>
          </div>

          <div className="dashboard__flags-list">
            {redFlags.map(({ patient, isInactive, hasHighOverdue, overdueCount, daysSinceActivity, streak, stage }) => (
              <div key={patient.id} className="dashboard__flag-row">

                <AvatarDisplay
                  name={patient.name}
                  avatarUrl={patient.avatar_url}
                  size={36}
                  className="dashboard__flag-avatar"
                />

                <div className="dashboard__flag-info">
                  <div className="dashboard__flag-name">{patient.name}</div>
                  <div className="dashboard__flag-tags">
                    {isInactive && (
                      <span className="dashboard__flag-tag dashboard__flag-tag--inactive">
                        {daysSinceActivity != null
                          ? `😴 Sem atividade há ${daysSinceActivity} dia${daysSinceActivity !== 1 ? "s" : ""}`
                          : "😴 Nunca acessou"}
                      </span>
                    )}
                    {hasHighOverdue && (
                      <span className="dashboard__flag-tag dashboard__flag-tag--overdue">
                        ⚠️ {overdueCount} exercício{overdueCount > 1 ? "s" : ""} vencido{overdueCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="dashboard__flag-plant"
                  title={`${stage.label} — ${streak} dias seguidos`}
                >
                  <span className="dashboard__flag-plant-icon" aria-hidden="true">
                    {stage.icon}
                  </span>
                  <span
                    className={["dashboard__flag-plant-streak", streak === 0 ? "dashboard__flag-plant-streak--zero" : ""].filter(Boolean).join(" ")}
                    style={{ color: streak === 0 ? undefined : stage.color }}
                  >
                    {streak}d
                  </span>
                </div>

                <button
                  className="dashboard__flag-btn"
                  onClick={() => setView("patients")}
                >
                  Ver paciente
                </button>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Pacientes recentes ── */}
      <div className="dashboard__recent-card">
        <h3 className="dashboard__recent-title">Pacientes recentes</h3>

        {stats.recent.length === 0 ? (
          <EmptyState
            icon="👥"
            message="Nenhum paciente ainda."
            sub='Gere um código em "Pacientes" para convidar.'
          />
        ) : (
          <>
            <div className="dashboard__recent-list">
              {stats.recent.map((p) => (
                <div key={p.id} className="dashboard__patient-row">
                  <AvatarDisplay
                    name={p.name}
                    avatarUrl={p.avatar_url}
                    size={38}
                    className="dashboard__patient-avatar"
                  />
                  <div className="dashboard__patient-info">
                    <div className="dashboard__patient-name">{p.name}</div>
                    <div className="dashboard__patient-email">{p.email}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="dashboard__see-all-btn"
              onClick={() => setView("patients")}
            >
              Ver todos →
            </button>
          </>
        )}
      </div>

    </div>
  );
}