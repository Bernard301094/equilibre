import "./BottomNav.css";

/**
 * Bottom Navigation used primarily in PatientLayout on mobile devices.
 *
 * Props:
 * navItems   — [{ id, icon, label, badge? }]
 * activeView — current view id
 * onNav      — (id) => void
 */
export default function BottomNav({ navItems = [], activeView, onNav }) {
  if (!navItems || navItems.length === 0) return null;

  return (
    <nav className="bottom-nav-container" aria-label="Navegação principal">
      {navItems.map((n) => {
        const isActive = activeView === n.id;
        
        return (
          <button
            key={n.id}
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
            onClick={() => onNav(n.id)}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="bottom-nav-icon-wrapper">
              <span className="bottom-nav-icon" aria-hidden="true">
                {n.icon}
              </span>
              {n.badge > 0 && (
                <span className="bottom-nav-badge" aria-label={`${n.badge} pendentes`}>
                  {n.badge > 9 ? "9+" : n.badge}
                </span>
              )}
            </div>
            <span className="bottom-nav-label">{n.label}</span>
          </button>
        );
      })}
    </nav>
  );
}