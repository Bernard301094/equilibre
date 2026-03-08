/**
 * Single metric card used in dashboard grids.
 *
 * Props:
 *   icon     — emoji
 *   value    — numeric or string value to display prominently
 *   label    — description below the value
 *   accent   — optional CSS color string to tint the value
 *   className — optional extra classes on the card
 */
export default function StatCard({ icon, value, label, accent, className = "" }) {
  return (
    <div className={`stat-card ${className}`.trim()}>
      <div className="stat-icon" aria-hidden="true">
        {icon}
      </div>
      <div
        className="stat-val"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}