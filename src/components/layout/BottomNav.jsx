import { useState } from "react";
import AvatarDisplay from "../shared/AvatarDisplay";

const FIXED_COUNT = 4; // primeiros 4 itens ficam sempre visíveis

export default function BottomNav({
  items,
  activeView,
  onNav,
  session,
  onAvatarClick,
  theme,
  toggleTheme,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fixedItems   = items.slice(0, FIXED_COUNT);
  const moreItems    = items.slice(FIXED_COUNT);
  const isMoreActive = moreItems.some((i) => i.id === activeView);

  const handleNav = (id) => {
    setDrawerOpen(false);
    onNav(id);
  };

  return (
    <>
      {/* Espaçador para compensar a barra fixa */}
      <div className="bottom-nav-spacer" aria-hidden="true" />

      {/* ── Backdrop do drawer ── */}
      {drawerOpen && (
        <div
          className="bottom-nav-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer "Mais opções" ── */}
      <div
        className={`bottom-nav-drawer${drawerOpen ? " open" : ""}`}
        role="dialog"
        aria-label="Mais opções de navegação"
        aria-hidden={!drawerOpen}
      >
        {/* Alça visual */}
        <div className="bottom-nav-handle" />

        {/* Grid de itens — colunas dinâmicas (JS necessário) */}
        <div
          className="bottom-nav-drawer-grid"
          style={{ gridTemplateColumns: `repeat(${moreItems.length}, 1fr)` }}
        >
          {moreItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={`bottom-nav-drawer-item${isActive ? " active" : ""}`}
                onClick={() => handleNav(item.id)}
                aria-label={item.label}
              >
                <div className="bottom-nav-drawer-icon">
                  <span aria-hidden="true">{item.icon}</span>
                  {item.badge > 0 && (
                    <span className="bottom-nav-badge" aria-hidden="true">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="bottom-nav-drawer-label">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra de navegação fixa ── */}
      <nav
        className="bottom-nav-bar"
        aria-label="Navegação principal"
      >
        {/* Itens fixos */}
        {fixedItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              className={`bottom-nav-btn${isActive ? " active" : ""}`}
              onClick={() => handleNav(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && <div className="bottom-nav-indicator" aria-hidden="true" />}

              <div className="bottom-nav-icon">
                <span aria-hidden="true">{item.icon}</span>
                {item.badge > 0 && (
                  <span className="bottom-nav-badge" aria-hidden="true">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>

              <span className="bottom-nav-label">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botão "Mais" */}
        {moreItems.length > 0 && (
          <button
            className={`bottom-nav-btn${isMoreActive && !drawerOpen ? " active" : ""}`}
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Mais opções"
            aria-expanded={drawerOpen}
          >
            {isMoreActive && !drawerOpen && (
              <div className="bottom-nav-indicator" aria-hidden="true" />
            )}

            <span
              className={[
                "bottom-nav-more-dots",
                drawerOpen      ? "open"   : "",
                isMoreActive    ? "active" : "",
              ].filter(Boolean).join(" ")}
              aria-hidden="true"
            >
              •••
            </span>

            <span
              className={`bottom-nav-label${isMoreActive || drawerOpen ? " active-label" : ""}`}
            >
              Mais
            </span>
          </button>
        )}

        {/* Slot de perfil */}
        <div className="bottom-nav-profile">
          <div className="bottom-nav-profile-inner">
            <button
              className="bottom-nav-profile-btn"
              onClick={onAvatarClick}
              aria-label="Perfil"
            >
              <AvatarDisplay
                name={session.name}
                avatarUrl={session.avatar_url}
                size={30}
              />
            </button>

            {toggleTheme && (
              <button
                className="bottom-nav-theme-btn"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Mudar para modo claro"
                    : "Mudar para modo escuro"
                }
              >
                <span aria-hidden="true">
                  {theme === "dark" ? "☀️" : "🌙"}
                </span>
              </button>
            )}
          </div>

          <span className="bottom-nav-profile-label">Perfil</span>
        </div>
      </nav>
    </>
  );
}