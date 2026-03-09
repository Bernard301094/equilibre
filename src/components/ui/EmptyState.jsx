import "./EmptyState.css";

/**
 * Centered empty state display.
 *
 * Props:
 * icon     — emoji or element
 * message  — primary text
 * sub      — optional secondary text
 * action   — optional { label, onClick } for a CTA button
 */
export default function EmptyState({ icon = "📭", message, sub, action }) {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      
      {message && <p className="empty-state-message">{message}</p>}
      
      {sub && <p className="empty-state-sub">{sub}</p>}
      
      {action && (
        <button
          className="empty-state-btn"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}