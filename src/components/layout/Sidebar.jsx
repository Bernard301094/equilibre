import AvatarDisplay from "../shared/AvatarDisplay";
import "./Sidebar.css";

/**
 * Shared sidebar shell used by both TherapistLayout and PatientLayout.
 *
 * Props:
 *   brand           — text beside the logo
 *   roleLabel       — subtitle shown below the brand
 *   navItems        — [{ id, icon, label, badge? }]
 *   activeView      — current view id
 *   onNav           — (id) => void
 *   session         — current session
 *   theme           — 'light' | 'dark'
 *   toggleTheme     — () => void
 *   onAvatarClick   — () => void  (opens ProfileModal)
 *   onLogout        — () => void
 *   onDeleteAccount — () => void
 *   extraHeader     — optional JSX rendered inside the header (e.g. notification bell)
 *   className       — optional extra class for the <aside> (e.g. "patient-layout__sidebar")
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
    <aside className={["sidebar", className].filter(Boolean).join(" ")}>

      {/* ── Header ── */}
      <div className="sidebar__header">
        <div className="sidebar__header-row">
          <div className="sidebar__brand">
            <img
              src="/equilibre-icon.png"
              alt=""
              aria-hidden="true"
              className="sidebar__logo"
            />
            {/*
              FIX · brand-text separado em <span> para que o CSS
              do modo colapsado possa ocultar apenas o texto via
              max-width:0 + opacity:0, mantendo o logo visível.
            */}
            <span className="sidebar__brand-text">{brand}</span>
          </div>
          {extraHeader && (
            <div className="sidebar__extra-header">{extraHeader}</div>
          )}
        </div>
        <div className="sidebar__role">{roleLabel}</div>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar__nav" aria-label="Navegação principal">
        {navItems.map((n) => (
          <button
            key={n.id}
            className={[
              "sidebar__nav-item",
              activeView === n.id ? "sidebar__nav-item--active" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => onNav(n.id)}
            aria-current={activeView === n.id ? "page" : undefined}
            /*
              FIX · data-label alimenta o tooltip CSS puro definido
              em Sidebar.css para o modo colapsado (768–1024px).
              O atributo title garante fallback nativo em todos os
              browsers e é lido por leitores de tela.
            */
            data-label={n.label}
            title={n.label}
          >
            <span className="sidebar__nav-icon" aria-hidden="true">
              {n.icon}
            </span>
            <span className="sidebar__nav-label">{n.label}</span>
            {n.badge > 0 && (
              <span
                className="sidebar__nav-badge"
                aria-label={`${n.badge} pendentes`}
              >
                {n.badge > 9 ? "9+" : n.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Footer / User pill ── */}
      <div className="sidebar__footer">
        <div className="sidebar__user-pill">

          <button
            className="sidebar__avatar-btn"
            onClick={onAvatarClick}
            aria-label="Abrir perfil e alterar foto"
            title="Mudar foto de perfil"
            type="button"
          >
            <AvatarDisplay
              name={session.name}
              avatarUrl={session.avatar_url}
              size={38}
              className="sidebar__avatar"
            />
          </button>

          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{session.name.split(" ")[0]}</div>
            <div className="sidebar__user-email">{session.email}</div>
          </div>

          <div className="sidebar__pill-actions">
            <button
              className="sidebar__icon-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            <button
              className="sidebar__icon-btn"
              title="Sair"
              aria-label="Encerrar sessão"
              onClick={onLogout}
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            <button
              className="sidebar__icon-btn sidebar__icon-btn--danger"
              title="Excluir conta"
              aria-label="Excluir conta permanentemente"
              onClick={onDeleteAccount}
            >
              <svg
                width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
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