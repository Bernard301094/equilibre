import { useState } from "react";
import AvatarDisplay from "../shared/AvatarDisplay";
import "./BottomNav.css";

const FIXED_COUNT = 4;

export default function BottomNav({
  items,
  activeView,
  onNav,
  session,
  onAvatarClick,
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
      {/* ── Backdrop del drawer ── */}
      {drawerOpen && (
        <div
          className="bottom-nav__backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer "Mais opções" ── */}
      <div
        className={[
          "bottom-nav__drawer",
          drawerOpen ? "bottom-nav__drawer--open" : "",
        ].filter(Boolean).join(" ")}
        role="dialog"
        aria-label="Mais opções de navegação"
        aria-hidden={!drawerOpen}
      >
        <div className="bottom-nav__drawer-handle" aria-hidden="true" />

        <div
          className="bottom-nav__drawer-grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(moreItems.length, 1)}, 1fr)` }}
        >
          {moreItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                className={[
                  "bottom-nav__drawer-item",
                  isActive ? "bottom-nav__drawer-item--active" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => handleNav(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                <div className="bottom-nav__drawer-icon-wrap">
                  <span className="bottom-nav__drawer-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.badge > 0 && (
                    <span className="bottom-nav__badge" aria-hidden="true">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="bottom-nav__drawer-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra de navegación fija ── */}
      <nav className="bottom-nav__bar" aria-label="Navegação principal">

        {/* Ítems fijos */}
        {fixedItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              className={[
                "bottom-nav__btn",
                isActive ? "bottom-nav__btn--active" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => handleNav(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <div className="bottom-nav__indicator" aria-hidden="true" />
              )}
              <div className="bottom-nav__icon-wrap">
                <span className="bottom-nav__icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.badge > 0 && (
                  <span className="bottom-nav__badge" aria-hidden="true">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="bottom-nav__label">{item.label}</span>
            </button>
          );
        })}

        {/* Botón "Mais" */}
        {moreItems.length > 0 && (
          <button
            className={[
              "bottom-nav__btn",
              isMoreActive && !drawerOpen ? "bottom-nav__btn--active" : "",
              drawerOpen ? "bottom-nav__btn--drawer-open" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Mais opções"
            aria-expanded={drawerOpen}
          >
            {isMoreActive && !drawerOpen && (
              <div className="bottom-nav__indicator" aria-hidden="true" />
            )}
            <span
              className={[
                "bottom-nav__more-dots",
                drawerOpen   ? "bottom-nav__more-dots--open"   : "",
                isMoreActive ? "bottom-nav__more-dots--active" : "",
              ].filter(Boolean).join(" ")}
              aria-hidden="true"
            >
              •••
            </span>
            <span
              className={[
                "bottom-nav__label",
                isMoreActive || drawerOpen ? "bottom-nav__label--active" : "",
              ].filter(Boolean).join(" ")}
            >
              Mais
            </span>
          </button>
        )}

        {/* ── Slot de perfil — sin botón de tema ── */}
        {/* CHANGE: se eliminaron `theme`, `toggleTheme` de las props y
            el <button className="bottom-nav__theme-btn"> completo.
            El toggle de tema queda delegado al ProfileModal que se abre
            al pulsar el avatar (onAvatarClick). */}
        <div className="bottom-nav__profile">
          <button
            className="bottom-nav__profile-btn"
            onClick={onAvatarClick}
            aria-label="Perfil"
          >
            <AvatarDisplay
              name={session.name}
              avatarUrl={session.avatar_url}
              size={30}
            />
          </button>
          <span className="bottom-nav__label" aria-hidden="true">Perfil</span>
        </div>

      </nav>
    </>
  );
}