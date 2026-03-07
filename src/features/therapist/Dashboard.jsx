import { useState, useEffect } from "react";
import db from "../../services/db";
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

export default function TherapistDashboard({ session, setView }) {
  const [stats,   setStats]   = useState({ patients: 0, done: 0, pending: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const patients = await db.query(
          "users",
          { select: "id,name,email,avatar_url", filter: { therapist_id: session.id, role: "patient" } },
          session.access_token
        );
        const pList = Array.isArray(patients) ? patients : [];
        const pIds  = pList.map((p) => p.id);

        const allAssign = pIds.length > 0
          ? await db.query(
              "assignments",
              { filterIn: { patient_id: pIds }, select: "id,status" },
              session.access_token
            ).then((r) => (Array.isArray(r) ? r : []))
          : [];

        if (active) {
          setStats({
            patients: pIds.length,
            done:     allAssign.filter((a) => a.status === "done").length,
            pending:  allAssign.filter((a) => a.status === "pending").length,
            recent:   pList.slice(0, 4),
          });
        }
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
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>{getGreeting(firstName)}</h2>
        <p>{getGreetingSub()}</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 28 }}>
        <StatCard icon="👥" value={stats.patients} label="Pacientes ativos"      />
        <StatCard icon="✅" value={stats.done}     label="Exercícios concluídos" />
        <StatCard icon="⏳" value={stats.pending}  label="Pendentes"             />
      </div>

      <div className="card">
        <h3 style={{ fontSize: 17, marginBottom: 14 }}>Pacientes recentes</h3>

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
            className="btn btn-outline btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => setView("patients")}
          >
            Ver todos →
          </button>
        )}
      </div>
    </div>
  );
}