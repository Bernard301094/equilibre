import EmptyState from "../../../components/ui/EmptyState";
import { formatDate } from "../../../utils/dates";
import "./RoutineTab.css";

export default function RoutineTab({ activities }) {
  const done    = activities.filter((a) => a.status === "concluido").length;
  const avoided = activities.filter((a) => a.status === "nao_realizado").length;

  if (activities.length === 0) {
    return <EmptyState icon="🗓️" message="Paciente ainda não planeou atividades." />;
  }

  return (
    <div className="routine-tab">

      {/* ── Descripción ── */}
      <p className="routine-tab__desc">
        Acompanhe o planejamento de atividades e padrões de evitação do paciente.
      </p>

      {/* ── Stats ── */}
      <div className="routine-tab__stats">
        <div className="routine-tab__stat routine-tab__stat--done">
          <span className="routine-tab__stat-value">{done}</span>
          <span className="routine-tab__stat-label">Concluídas</span>
        </div>
        <div className="routine-tab__stat routine-tab__stat--avoided">
          <span className="routine-tab__stat-value">{avoided}</span>
          <span className="routine-tab__stat-label">Evitadas</span>
        </div>
      </div>

      {/* ── Historial ── */}
      <h4 className="routine-tab__history-title">Histórico de Atividades</h4>

      <div className="routine-tab__activity-list">
        {activities.map((act) => (
          <div key={act.id} className="routine-tab__activity-card">

            {/* Fila superior: categoría + fecha */}
            <div className="routine-tab__activity-header">
              <span className={`cat-badge cat-${act.category}`}>
                {act.category}
              </span>
              <span className="routine-tab__activity-date">
                {formatDate(act.planned_date, { day: "2-digit", month: "2-digit" })}
              </span>
            </div>

            {/* Título */}
            <div className="routine-tab__activity-title">{act.title}</div>

            {/* Estado: pendente */}
            {act.status === "pendente" && (
              <div className="routine-tab__status routine-tab__status--pending">
                ⏳ Pendente
              </div>
            )}

            {/* Estado: concluido */}
            {act.status === "concluido" && (
              <div className="routine-tab__status-detail routine-tab__status-detail--done">
                <strong className="routine-tab__status-detail-title">✓ Realizado</strong>
                <span className="routine-tab__status-detail-body">
                  Humor: {act.mood_before} → <strong>{act.mood_after}</strong>
                  {" "}| Energia final: {act.energy_after}
                </span>
              </div>
            )}

            {/* Estado: nao_realizado */}
            {act.status === "nao_realizado" && (
              <div className="routine-tab__status-detail routine-tab__status-detail--avoided">
                <strong className="routine-tab__status-detail-title">✕ Evitado</strong>
                <span className="routine-tab__status-detail-body">
                  Motivo: <em>{act.avoidance_reason}</em>
                </span>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
}