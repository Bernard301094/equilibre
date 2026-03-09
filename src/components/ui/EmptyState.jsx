import "./EmptyState.css";

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
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>

      {message && (
        <p className="empty-state__message">{message}</p>
      )}

      {sub && (
        <p className="empty-state__sub">{sub}</p>
      )}

      {action && (
        <button
          className="btn btn-sage btn-sm empty-state__action"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}