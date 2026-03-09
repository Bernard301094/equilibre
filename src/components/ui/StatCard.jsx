import "./StatCard.css";

export default function StatCard({ icon, value, label, accent, className = "" }) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div
        className="stat-card__value"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}