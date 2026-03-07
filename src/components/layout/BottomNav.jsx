import AvatarDisplay from "../shared/AvatarDisplay";

export default function BottomNav({ items, activeView, onNav, session, onAvatarClick, theme, toggleTheme }) {
  // Show max 5 items in bottom nav
  const visibleItems = items.slice(0, 4);

  return (
    <>
      {/* Spacer so content isn't hidden behind the bar */}
      <div style={{ height: 72 }} aria-hidden="true" />

      <nav
        aria-label="Navegação principal"
        style={{
          position:        "fixed",
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          100,
          background:      "var(--white)",
          borderTop:       "1px solid var(--warm)",
          display:         "flex",
          alignItems:      "stretch",
          height:          64,
          boxShadow:       "0 -4px 24px rgba(15,30,42,0.10)",
          backdropFilter:  "blur(12px)",
          paddingBottom:   "env(safe-area-inset-bottom)",
        }}
      >
        {visibleItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              style={{
                flex:           1,
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            3,
                background:     "transparent",
                border:         "none",
                cursor:         "pointer",
                padding:        "8px 4px",
                position:       "relative",
                transition:     "all .2s",
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div style={{
                  position:     "absolute",
                  top:          0,
                  left:         "20%",
                  right:        "20%",
                  height:       3,
                  borderRadius: "0 0 3px 3px",
                  background:   "linear-gradient(90deg,#17527c,#2e7fab)",
                }} />
              )}

              {/* Icon + badge */}
              <div style={{ position: "relative", fontSize: 22 }}>
                <span aria-hidden="true">{item.icon}</span>
                {item.badge > 0 && (
                  <span style={{
                    position:       "absolute",
                    top:            -4,
                    right:          -6,
                    background:     "#e07820",
                    color:          "#fff",
                    borderRadius:   "50%",
                    width:          16,
                    height:         16,
                    fontSize:       9,
                    fontWeight:     700,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontFamily:     "'DM Sans', sans-serif",
                  }}>
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize:   10,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'DM Sans', sans-serif",
                color:      isActive ? "var(--blue-dark)" : "var(--text-muted)",
                transition: "color .2s",
                lineHeight: 1,
              }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Slot de perfil + tema — celda compartida */}
        <div
          style={{
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            3,
            padding:        "8px 4px",
          }}
        >
          {/* Fila con avatar y toggle de tema */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={onAvatarClick}
              aria-label="Perfil"
              style={{
                background: "transparent",
                border:     "none",
                cursor:     "pointer",
                padding:    0,
                lineHeight: 0,
              }}
            >
              <AvatarDisplay
                name={session.name}
                avatarUrl={session.avatar_url}
                size={30}
              />
            </button>

            {toggleTheme && (
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
                style={{
                  background:   "var(--warm)",
                  border:       "none",
                  borderRadius: "50%",
                  width:        24,
                  height:       24,
                  cursor:       "pointer",
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                  fontSize:     13,
                  lineHeight:   1,
                  flexShrink:   0,
                }}
              >
                <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
              </button>
            )}
          </div>

          <span style={{
            fontSize:   10,
            fontWeight: 500,
            color:      "var(--text-muted)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
          }}>
            Perfil
          </span>
        </div>
      </nav>
    </>
  );
}