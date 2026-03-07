import { useState } from "react";
import AvatarDisplay from "../shared/AvatarDisplay";

const FIXED_COUNT = 4; // primeiros 4 itens ficam sempre visíveis

export default function BottomNav({ items, activeView, onNav, session, onAvatarClick, theme, toggleTheme }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fixedItems = items.slice(0, FIXED_COUNT);
  const moreItems  = items.slice(FIXED_COUNT);
  const isMoreActive = moreItems.some((i) => i.id === activeView);

  const handleNav = (id) => {
    setDrawerOpen(false);
    onNav(id);
  };

  return (
    <>
      <div style={{ height: 72 }} aria-hidden="true" />

      {/* ── Backdrop do drawer ── */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position:   "fixed",
            inset:      0,
            zIndex:     99,
            background: "rgba(15,30,42,0.35)",
            backdropFilter: "blur(2px)",
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Drawer "Mais opções" ── */}
      <div
        role="dialog"
        aria-label="Mais opções de navegação"
        aria-hidden={!drawerOpen}
        style={{
          position:     "fixed",
          bottom:       64,
          left:         0,
          right:        0,
          zIndex:       100,
          background:   "var(--white)",
          borderRadius: "20px 20px 0 0",
          boxShadow:    "0 -8px 32px rgba(15,30,42,0.18)",
          padding:      "12px 8px 16px",
          transform:    drawerOpen ? "translateY(0)" : "translateY(110%)",
          transition:   "transform .28s cubic-bezier(.4,0,.2,1)",
          pointerEvents: drawerOpen ? "auto" : "none",
        }}
      >
        {/* Alça visual */}
        <div style={{
          width:        40,
          height:       4,
          borderRadius: 2,
          background:   "var(--warm)",
          margin:       "0 auto 16px",
        }} />

        <div style={{
          display:             "grid",
          gridTemplateColumns: `repeat(${moreItems.length}, 1fr)`,
          gap:                 4,
        }}>
          {moreItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                aria-label={item.label}
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            6,
                  background:     isActive ? "var(--blue-light, #e8f3fb)" : "transparent",
                  border:         isActive ? "1.5px solid #2e7fab33" : "1.5px solid transparent",
                  borderRadius:   14,
                  cursor:         "pointer",
                  padding:        "12px 8px",
                  transition:     "all .18s",
                  position:       "relative",
                }}
              >
                <div style={{ position: "relative", fontSize: 26 }}>
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
                <span style={{
                  fontSize:   11,
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: "'DM Sans', sans-serif",
                  color:      isActive ? "var(--blue-dark)" : "var(--text-muted)",
                  lineHeight: 1,
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barra de navegação fixa ── */}
      <nav
        aria-label="Navegação principal"
        style={{
          position:       "fixed",
          bottom:         0,
          left:           0,
          right:          0,
          zIndex:         101,
          background:     "var(--white)",
          borderTop:      "1px solid var(--warm)",
          height:         64,
          boxShadow:      "0 -4px 24px rgba(15,30,42,0.10)",
          backdropFilter: "blur(12px)",
          paddingBottom:  "env(safe-area-inset-bottom)",
          display:        "flex",
          alignItems:     "stretch",
        }}
      >
        {/* Itens fixos */}
        {fixedItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
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

              <span style={{
                fontSize:   10,
                fontWeight: isActive ? 700 : 500,
                fontFamily: "'DM Sans', sans-serif",
                color:      isActive ? "var(--blue-dark)" : "var(--text-muted)",
                transition: "color .2s",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Botão "Mais" */}
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          aria-label="Mais opções"
          aria-expanded={drawerOpen}
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
          {isMoreActive && !drawerOpen && (
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

          <div style={{
            fontSize:       20,
            lineHeight:     1,
            color:          isMoreActive || drawerOpen ? "var(--blue-dark)" : "var(--text-muted)",
            transition:     "transform .28s cubic-bezier(.4,0,.2,1)",
            transform:      drawerOpen ? "rotate(180deg)" : "rotate(0deg)",
            fontWeight:     700,
            letterSpacing:  2,
          }}>
            •••
          </div>

          <span style={{
            fontSize:   10,
            fontWeight: isMoreActive || drawerOpen ? 700 : 500,
            fontFamily: "'DM Sans', sans-serif",
            color:      isMoreActive || drawerOpen ? "var(--blue-dark)" : "var(--text-muted)",
            transition: "color .2s",
            lineHeight: 1,
          }}>
            Mais
          </span>
        </button>

        {/* Slot de perfil */}
        <div style={{
          flex:           1,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          gap:            3,
          padding:        "8px 4px",
        }}>
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
                style={{
                  background:     "var(--warm)",
                  border:         "none",
                  borderRadius:   "50%",
                  width:          24,
                  height:         24,
                  cursor:         "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       13,
                  lineHeight:     1,
                  flexShrink:     0,
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