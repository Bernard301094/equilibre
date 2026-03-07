import EmptyState from "../../../components/ui/EmptyState";
import { formatDate } from "../../../utils/dates";

export default function RoutineTab({ activities }) {
  const done    = activities.filter((a) => a.status === "concluido").length;
  const avoided = activities.filter((a) => a.status === "nao_realizado").length;

  if (activities.length === 0) {
    return <EmptyState icon="🗓️" message="Paciente ainda não planeou atividades." />;
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Acompanhe o planejamento de atividades e padrões de evitação do paciente.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: "#d4edd9", padding: 14, borderRadius: 12, border: "1px solid #c3e6cb" }}>
          <div style={{ fontSize: 22, color: "#2d7a3a", fontWeight: "bold" }}>{done}</div>
          <div style={{ fontSize: 11, color: "#2d7a3a", textTransform: "uppercase", fontWeight: 600 }}>Concluídas</div>
        </div>
        <div style={{ background: "#fce8e8", padding: 14, borderRadius: 12, border: "1px solid #f9caca" }}>
          <div style={{ fontSize: 22, color: "#c0444a", fontWeight: "bold" }}>{avoided}</div>
          <div style={{ fontSize: 11, color: "#c0444a", textTransform: "uppercase", fontWeight: 600 }}>Evitadas</div>
        </div>
      </div>

      <h4 style={{ fontSize: 13, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 10 }}>
        Histórico de Atividades
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activities.map((act) => (
          <div key={act.id} style={{ background: "var(--cream)", border: "1.5px solid var(--warm)", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span className={`cat-badge cat-${act.category}`}>{act.category}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {formatDate(act.planned_date, { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
              {act.title}
            </div>

            {act.status === "pendente" && (
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>⏳ Pendente</div>
            )}
            {act.status === "concluido" && (
              <div style={{ background: "var(--white)", padding: 8, borderRadius: 8, fontSize: 12, border: "1px solid #d4edd9" }}>
                <strong style={{ color: "#2d7a3a" }}>✓ Realizado</strong><br />
                Humor: {act.mood_before} → <strong>{act.mood_after}</strong> | Energia final: {act.energy_after}
              </div>
            )}
            {act.status === "nao_realizado" && (
              <div style={{ background: "var(--white)", padding: 8, borderRadius: 8, fontSize: 12, border: "1px solid #fce8e8" }}>
                <strong style={{ color: "#c0444a" }}>✕ Evitado</strong><br />
                Motivo: <em>{act.avoidance_reason}</em>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}