import AvatarDisplay from "../shared/AvatarDisplay";

export default function BottomNav({ items, activeView, onNav, session, onAvatarClick }) {
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
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNav(item.view)}
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

        {/* Avatar button — abre perfil */}
        <button
          onClick={onAvatarClick}
          aria-label="Perfil"
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
          }}
        >
          <AvatarDisplay
            name={session.name}
            avatarUrl={session.avatar_url}
            size={26}
          />
          <span style={{
            fontSize:   10,
            fontWeight: 500,
            color:      "var(--text-muted)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1,
          }}>
            Perfil
          </span>
        </button>
      </nav>
    </>
  );
}