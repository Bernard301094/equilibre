/**
 * Horizontal progress bar showing weekly exercise goal completion.
 *
 * Props:
 *   done    — number of exercises completed this week
 *   target  — weekly target set by the therapist
 */
export default function WeekGoalBar({ done, target }) {
  if (!target || target <= 0) return null;

  const pct = Math.min(100, Math.round((done / target) * 100));
  const color =
    pct >= 100 ? "#2d7a3a" : pct >= 50 ? "var(--blue-dark)" : "var(--accent)";

  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        <span>Meta semanal</span>
        <span style={{ fontWeight: 600, color }}>
          {done}/{target} exercícios
        </span>
      </div>

      <div className="goal-bar-bg">
        <div
          className="goal-bar-fill"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "#2d7a3a" : undefined,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div style={{ fontSize: 11, color, textAlign: "right", marginTop: 3 }}>
        {pct >= 100 ? "🎉 Meta atingida!" : `${pct}% concluído`}
      </div>
    </div>
  );
}