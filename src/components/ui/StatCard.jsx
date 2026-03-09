import "./StatCard.css";

/**
 * Single metric card used in dashboard grids.
 *
 * Props:
 * icon     — emoji
 * value    — numeric or string value to display prominently
 * label    — description below the value
 * accent   — optional CSS color string to tint the value (via CSS variable)
 * className— optional extra CSS class for layout positioning
 */
export default function StatCard({ icon, value, label, accent, className = "" }) {
  // Inyectamos el color dinámico como un Token CSS para evitar estilos en línea directos
  const dynamicStyle = accent ? { "--stat-accent": accent } : {};

  return (
    <div 
      className={`stat-card-container ${className}`.trim()} 
      style={dynamicStyle}
    >
      <div className="stat-card-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card-value">
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}