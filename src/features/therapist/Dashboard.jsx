import { useState, useEffect } from "react";
import db from "../../services/db";
import { calcStreak, localDateOffset, isOverdue } from "../../utils/dates";
import { getPlantStage } from "../../utils/constants";
import { SkeletonDashboard } from "../../components/ui/Skeleton";
import StatCard from "../../components/ui/StatCard";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";

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

const daysAgoStr = (n) => localDateOffset(n);

export default function TherapistDashboard({ session, setView }) {
  const [stats,   setStats]   = useState({ patients: 0, done: 0, pending: 0, recent: [] });
  const [redFlags, setRedFlags] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        console.log("[Dashboard] session.id:", session.id);
        console.log("[Dashboard] session.access_token present:", !!session.access_token);

        const patientsRaw = await db.query(
          "users",
          { filter: { therapist_id: session.id, role: "patient" } },
          session.access_token
        );

        console.log("[Dashboard] patientsRaw:", patientsRaw);

        const pList = Array.isArray(patientsRaw)
          ? patientsRaw
          : patientsRaw && typeof patientsRaw === "object"
          ? [patientsRaw]
          : [];

        const pIds = pList.map((p) => p.id);
        console.log("[Dashboard] pIds:", pIds);

        const [allAssign, diaryRows, respRows] = pIds.length > 0
          ? await Promise.all([
              db.query(
                "assignments",
                { filterIn: { patient_id: pIds }, select: "id,patient_id,status,due_date" },
                session.access_token
              ).then((r) => {
                console.log("[Dashboard] assignments raw:", r);
                return Array.isArray(r) ? r : r && typeof r === "object" ? [r] : [];
              }).catch((e) => { console.error("[Dashboard] assignments error:", e); return []; }),
              db.query(
                "diary_entries",
                { filterIn: { patient_id: pIds }, select: "patient_id,date" },
                session.access_token
              ).catch((e) => { console.error("[Dashboard] diary error:", e); return []; }),
              db.query(
                "responses",
                { filterIn: { patient_id: pIds }, select: "patient_id,completed_at" },
                session.access_token
              ).catch((e) => { console.error("[Dashboard] responses error:", e); return []; }),
            ])
          : [[], [], []];

        console.log("[Dashboard] allAssign:", allAssign);

        if (!active) return;

        // ── Red Flags ──────────────────────────────────────────────────────────────
        const threeDaysAgo = daysAgoStr(3);
        const flags = [];

        for (const p of pList) {
          const diaryDates = (Array.isArray(diaryRows) ? diaryRows : [])
            .filter((d) => d.patient_id === p.id)
            .map((d) => d.date);
          const respDates = (Array.isArray(respRows) ? respRows : [])
            .filter((r) => r.patient_id === p.id)
            .map((r) => r.completed_at?.slice(0, 10))
            .filter(Boolean);

          const allDates  = [...diaryDates, ...respDates];
          const lastDate  = allDates.sort().reverse()[0] ?? null;
          const isInactive = !lastDate || lastDate < threeDaysAgo;

          const patientPending = allAssign.filter((a) => a.patient_id === p.id && a.status === "pending");
          const overdueCount   = patientPending.filter((a) => isOverdue(a.due_date)).length;
          const hasHighOverdue = overdueCount >= 3;

          if (isInactive || hasHighOverdue) {
            const streak = calcStreak(allDates);
            const stage  = getPlantStage(streak);
            flags.push({
              patient: p, isInactive, hasHighOverdue, overdueCount, lastDate,
              streak, stage,
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
    <div className="page-fade-in">
      <div className="page-header">
        <h2>{getGreeting(firstName)}</h2>
        <p>{getGreetingSub()}</p>
      </div>

      {/* ── Stats ── */}
      <div className="grid-3 td-stats-grid">
        <StatCard icon="👥" value={stats.patients} label="Pacientes ativos"      />
        <StatCard icon="✅" value={stats.done}     label="Exercícios concluídos" />
        <StatCard icon="⏳" value={stats.pending}  label="Pendentes"             />
      </div>

      {/* ── Red Flags ── */}
      {redFlags.length > 0 && (
        <div className="card td-flags-card">
          <div className="td-flags-header">
            <span className="td-flags-icon" aria-hidden="true">🚨</span>
            <div>
              <h3 className="td-flags-title">Alertas de Atenção</h3>
              <p className="td-flags-sub">
                {redFlags.length} paciente{redFlags.length > 1 ? "s" : ""} precisam da sua atenção
              </p>
            </div>
          </div>

          <div className="td-flags-list">
            {redFlags.map(({ patient, isInactive, hasHighOverdue, overdueCount, daysSinceActivity, streak, stage }) => (
              <div key={patient.id} className="td-flag-row">
                {/* Avatar */}
                <AvatarDisplay
                  name={patient.name}
                  avatarUrl={patient.avatar_url}
                  size={36}
                  className="p-avatar"
                />

                {/* Info */}
                <div className="td-flag-info">
                  <div className="td-flag-name">{patient.name}</div>
                  <div className="td-flag-tags">
                    {isInactive && (
                      <span className="td-flag-tag td-flag-tag--inactive">
                        {daysSinceActivity != null
                          ? `😴 Sem atividade há ${daysSinceActivity} dia${daysSinceActivity !== 1 ? "s" : ""}`
                          : "😴 Nunca acessou"}
                      </span>
                    )}
                    {hasHighOverdue && (
                      <span className="td-flag-tag td-flag-tag--overdue">
                        ⚠️ {overdueCount} exercício{overdueCount > 1 ? "s" : ""} vencido{overdueCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Plant indicator */}
                <div
                  className="td-flag-plant"
                  title={`${stage.label} — ${streak} dias seguidos`}
                >
                  <span className="td-flag-plant-icon" aria-hidden="true">{stage.icon}</span>
                  <span
                    className="td-flag-plant-streak"
                    style={{ color: streak === 0 ? "var(--text-muted)" : stage.color }}
                  >
                    {streak}d
                  </span>
                </div>

                {/* Action */}
                <button
                  className="btn btn-outline btn-sm td-flag-btn"
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
      <div className="card">
        <h3 className="td-recent-title">Pacientes recentes</h3>

        {stats.recent.length === 0 && (
          <EmptyState
            icon="👥"
            message="Nenhum paciente ainda."
            sub='Gere um código em "Pacientes" para convidar.'
          />
        )}

        {stats.recent.map((p) => (
          <div key={p.id} className="patient-row">
            <AvatarDisplay name={p.name} avatarUrl={p.avatar_url} size={38} className="p-avatar" />
            <div>
              <div className="p-name">{p.name}</div>
              <div className="p-email">{p.email}</div>
            </div>
          </div>
        ))}

        {stats.recent.length > 0 && (
          <button
            className="btn btn-outline btn-sm td-see-all-btn"
            onClick={() => setView("patients")}
          >
            Ver todos →
          </button>
        )}
      </div>
    </div>
  );
}

