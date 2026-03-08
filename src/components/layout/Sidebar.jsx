import AvatarDisplay from "../shared/AvatarDisplay";

/**
 * Shared sidebar shell used by both TherapistLayout and PatientLayout.
 *
 * Props:
 *   brand          — text beside the logo
 *   roleLabel      — subtitle shown below the brand
 *   navItems       — [{ id, icon, label, badge? }]
 *   activeView     — current view id
 *   onNav          — (id) => void
 *   session        — current session
 *   theme          — 'light' | 'dark'
 *   toggleTheme    — () => void
 *   onAvatarClick  — () => void  (opens ProfileModal)
 *   onLogout       — () => void
 *   onDeleteAccount — () => void
 *   extraHeader    — optional JSX rendered inside the header (e.g. notification bell)
 *   className      — optional extra class for the <aside> (e.g. "patient-sidebar")
 */
export default function Sidebar({
  brand,
  roleLabel,
  navItems = [],
  activeView,
  onNav,
  session,
  theme,
  toggleTheme,
  onAvatarClick,
  onLogout,
  onDeleteAccount,
  extraHeader,
  className = "",
}) {
  return (
    <aside className={`sidebar ${className}`.trim()}>
      {/* ── Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div className="sidebar-brand">
            <img
              src="/equilibre-icon.png"
              alt=""
              aria-hidden="true"
              className="sidebar-logo"
            />
            {brand}
          </div>
          {extraHeader}
        </div>
        <div className="role">{roleLabel}</div>
      </div>

      {/* ── Nav ── */}
      <nav aria-label="Navegação principal">
        {navItems.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${activeView === n.id ? "active" : ""}`}
            onClick={() => onNav(n.id)}
            aria-current={activeView === n.id ? "page" : undefined}
          >
            <span className="icon" aria-hidden="true">
              {n.icon}
            </span>
            {n.label}
            {n.badge > 0 && (
              <span
                className="nav-badge"
                aria-label={`${n.badge} pendentes`}
              >
                {n.badge > 9 ? "9+" : n.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Footer / User pill ── */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <AvatarDisplay
            name={session.name}
            avatarUrl={session.avatar_url}
            size={38}
            className="avatar"
            onClick={onAvatarClick}
            title="Mudar foto de perfil"
          />

          <div className="user-info">
            <div className="name">{session.name.split(" ")[0]}</div>
            <div className="email">{session.email}</div>
          </div>

          <div className="pill-actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Mudar para modo claro"
                  : "Mudar para modo escuro"
              }
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              className="pill-btn"
              title="Sair"
              aria-label="Encerrar sessão"
              onClick={onLogout}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            <button
              className="pill-btn delete"
              title="Excluir conta"
              aria-label="Excluir conta permanentemente"
              onClick={onDeleteAccount}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}