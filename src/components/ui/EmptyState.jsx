/**
 * Centered empty state display.
 *
 * Props:
 *   icon     — emoji or element
 *   message  — primary text
 *   sub      — optional secondary text
 *   action   — optional { label, onClick } for a CTA button
 */
export default function EmptyState({ icon = "📭", message, sub, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      {message && <p>{message}</p>}
      {sub && (
        <p style={{ fontSize: 13, marginTop: 4, color: "var(--text-muted)" }}>
          {sub}
        </p>
      )}
      {action && (
        <button
          className="btn btn-sage btn-sm"
          style={{ marginTop: 14 }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}