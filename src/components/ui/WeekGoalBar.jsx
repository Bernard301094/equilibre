import "./WeekGoalBar.css";

/**
 * Barra de progreso para la meta semanal del paciente.
 *
 * Props:
 * completed  — número de días o tareas completadas (ej. 2)
 * goal       — meta semanal (ej. 3)
 * label      — texto descriptivo (default: "Meta semanal")
 * className  — clase extra opcional para el layout
 */
export default function WeekGoalBar({ 
  completed = 0, 
  goal = 3, 
  label = "Meta semanal",
  className = "" 
}) {
  // Calculamos el porcentaje asegurando que no pase de 100% ni sea menor a 0
  const percentage = Math.min(100, Math.max(0, (completed / goal) * 100)) || 0;
  const isGoalReached = completed >= goal;

  return (
    <div className={`week-goal-container ${className}`.trim()}>
      <div className="week-goal-header">
        <span className="week-goal-label">{label}</span>
        <span className="week-goal-text">
          <strong>{completed}</strong> / {goal}
        </span>
      </div>
      
      <div 
        className="week-goal-track" 
        role="progressbar" 
        aria-valuenow={completed} 
        aria-valuemin="0" 
        aria-valuemax={goal}
        aria-label={label}
      >
        <div 
          className={`week-goal-fill ${isGoalReached ? "goal-reached" : ""}`} 
          style={{ "--goal-progress": `${percentage}%` }}
        ></div>
      </div>
      
      {isGoalReached && (
        <p className="week-goal-success" role="status">
          🎉 Meta alcançada!
        </p>
      )}
    </div>
  );
}