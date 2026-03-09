import "./WeekGoalBar.css";

export default function WeekGoalBar({ done, target }) {
  if (!target || target <= 0) return null;

  const pct     = Math.min(100, Math.round((done / target) * 100));
  const isDone  = pct >= 100;
  const isMid   = pct >= 50;

  const statusMod = isDone ? "done" : isMid ? "mid" : "low";

  return (
    <div
      className="wgb"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Meta semanal: ${done} de ${target} exercícios`}
    >
      <div className="wgb__header">
        <span className="wgb__label">Meta semanal</span>
        <span className={`wgb__count wgb__count--${statusMod}`}>
          {done}/{target} exercícios
        </span>
      </div>

      <div className="wgb__track">
        <div
          className={`wgb__fill wgb__fill--${statusMod}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className={`wgb__footer wgb__footer--${statusMod}`}>
        {isDone ? "🎉 Meta atingida!" : `${pct}% concluído`}
      </div>
    </div>
  );
}