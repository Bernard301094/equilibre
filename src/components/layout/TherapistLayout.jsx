import { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import ToastContainer from "../ui/Toast";
import TherapistDashboard  from "../../features/therapist/Dashboard";
import PatientsView        from "../../features/therapist/PatientsView";
import ExercisesView       from "../../features/therapist/ExercisesView";
import CreateExerciseView  from "../../features/therapist/CreateExerciseView";
import ResponsesView       from "../../features/therapist/ResponsesView";
import TherapistProgress   from "../../features/therapist/ProgressView";
import NotificationsView   from "../../features/therapist/NotificationsView";
import ProfileModal        from "../shared/ProfileModal";
import DeleteAccountModal  from "../shared/DeleteAccountModal";
import { useNotifications } from "../../hooks/useNotifications";

const NAV_ITEMS = () => [
  { id: "dashboard",  icon: "🏠", label: "Início"     },
  { id: "patients",   icon: "👥", label: "Pacientes"  },
  { id: "exercises",  icon: "📚", label: "Exercícios" },
  { id: "create",     icon: "✏️",  label: "Criar"      },
  { id: "progress",   icon: "📈", label: "Progresso"  },
  { id: "responses",  icon: "💬", label: "Respostas"  },
];

const BOTTOM_ITEMS = () => [
  { id: "dashboard",  icon: "🏠", label: "Início"     },
  { id: "patients",   icon: "👥", label: "Pacientes"  },
  { id: "exercises",  icon: "📚", label: "Exercícios" },
  { id: "create",     icon: "✏️",  label: "Criar"      },
  { id: "progress",   icon: "📈", label: "Progresso"  },
  { id: "responses",  icon: "💬", label: "Respostas"  },
];

function LogoutDialog({ onConfirm, onCancel }) {
  return (
    <div className="delete-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="delete-icon">👋</div>
        <div className="delete-title">Sair da conta?</div>
        <div className="delete-desc">Você precisará fazer login novamente para aceder à plataforma.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>Sair</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FloatingBell — botão flutuante de notificações (mobile only)

   Usa as mesmas classes CSS (.notif-bell, .notif-dot) e o mesmo
   emoji do sino da Sidebar para garantir consistência visual.
   A diferença está apenas no posicionamento fixo e no fundo
   colorido que dá destaque no mobile.
───────────────────────────────────────────────────────────── */
function FloatingBell({ unreadCount, isActive, onClick }) {
  const [shake, setShake] = useState(false);
  const prevCount = useRef(unreadCount);

  // Dispara shake cada vez que chega uma nova notificação
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 700);
      prevCount.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  return (
    <>
      <style>{`
        /* Shake: replica o rotate(-12deg) scale(1.1) do .notif-bell:hover
           da Sidebar, mas como keyframe contínuo para o mobile */
        @keyframes bell-shake {
          0%,100% { transform: rotate(0deg)   scale(1);    }
          15%     { transform: rotate(-14deg)  scale(1.08); }
          30%     { transform: rotate( 12deg)  scale(1.10); }
          45%     { transform: rotate(-10deg)  scale(1.08); }
          60%     { transform: rotate(  8deg)  scale(1.05); }
          75%     { transform: rotate( -5deg)  scale(1.02); }
          90%     { transform: rotate(  2deg)  scale(1.01); }
        }

        /* Pulso de atenção periódico quando há não-lidas */
        @keyframes bell-attention {
          0%,100% { box-shadow: 0 4px 20px rgba(224,120,32,0.45); }
          50%     { box-shadow: 0 4px 28px rgba(224,120,32,0.80),
                                0 0 0 8px rgba(224,120,32,0.12); }
        }

        @keyframes badge-in {
          from { transform: translate(30%,-30%) scale(0); opacity: 0; }
          to   { transform: translate(30%,-30%) scale(1); opacity: 1; }
        }

        /* Botão flutuante: posição fixa + fundo colorido,
           tudo o resto herdado dos padrões do .notif-bell */
        .floating-bell-wrap {
          position:   fixed;
          top:        14px;
          right:      14px;
          z-index:    200;
          /* Círculo de fundo para dar destaque no mobile */
          width:      48px;
          height:     48px;
          border-radius: 50%;
          display:    flex;
          align-items: center;
          justify-content: center;
          transition: background .25s, box-shadow .25s;
        }
        .floating-bell-wrap.has-unread:not(.is-active) {
          animation: bell-attention 2.4s ease-in-out infinite;
        }

        /* O .notif-bell interno herda hover e transform do CSS global,
           mas sobrescrevemos a cor para branco (fundo é escuro) */
        .floating-bell-wrap .notif-bell {
          color: rgba(255,255,255,0.90) !important;
          font-size: 22px !important;
          padding: 0 !important;
          transition: transform .3s cubic-bezier(.4,0,.2,1), color .2s !important;
        }
        /* Activo: icono rotado mientras el panel está abierto.
           Al cerrar, la transición de arriba lo devuelve suavemente. */
        .floating-bell-wrap.is-active .notif-bell {
          transform: rotate(-12deg) scale(1.1) !important;
          color: #ffffff !important;
        }
        /* Hover solo en dispositivos con puntero real (mouse).
           En táctil se desactiva para no interferir con el toggle. */
        @media (hover: hover) {
          .floating-bell-wrap .notif-bell:hover {
            color: #ffffff !important;
          }
        }
        /* Shake dispara via classe adicional */
        .floating-bell-wrap.is-shaking .notif-bell {
          animation: bell-shake .7s cubic-bezier(.4,0,.2,1) !important;
        }

        /* Badge: mesmo .notif-dot mas com cores invertidas para contrastar
           com o fundo colorido do botão flutuante */
        .floating-bell-wrap .notif-dot {
          /* Posição já definida no CSS global — apenas cores */
          background: #ffffff !important;
          color:      #e07820 !important;
          font-size:  10px !important;
          min-width:  18px !important;
          height:     18px !important;
          padding:    0 4px !important;
          border-radius: 9px !important;
          animation:  badge-in .3s cubic-bezier(.34,1.56,.64,1);
        }
        /* Quando a view de notificações está ativa: badge amarelo */
        .floating-bell-wrap.is-active .notif-dot {
          background: var(--yellow) !important;
          color:      #0f1e2a      !important;
        }
      `}</style>

      <div
        className={[
          "floating-bell-wrap",
          unreadCount > 0 && !isActive ? "has-unread" : "",
          shake                         ? "is-shaking" : "",
          isActive                      ? "is-active"  : "",
        ].filter(Boolean).join(" ")}
        style={{
          background: isActive
            ? "linear-gradient(135deg,#17527c,#2e7fab)"
            : unreadCount > 0
              ? "linear-gradient(135deg,#e07820,#c06010)"
              : "rgba(23,82,124,0.82)",
          backdropFilter: "blur(8px)",
          boxShadow: isActive
            ? "0 4px 18px rgba(23,82,124,0.45)"
            : unreadCount > 0
              ? "0 4px 20px rgba(224,120,32,0.45)"
              : "0 4px 14px rgba(23,82,124,0.30)",
        }}
      >
        {/* Mesmo componente de botão que a Sidebar usa no extraHeader */}
        <button
          className="notif-bell"
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}${isActive ? " — clique para fechar" : ""}`}
          aria-pressed={isActive}
          onClick={onClick}
        >
          🔔
          {unreadCount > 0 && (
            <span className="notif-dot" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

export default function TherapistLayout({ session, setSession, logout, theme, toggleTheme }) {
  const [view,          setView]          = useState("dashboard");
  const [showProfile,   setShowProfile]   = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);

  // Guarda a view anterior para o toggle do sino poder voltar a ela
  const prevViewRef = useRef("dashboard");

  const { unreadCount, markAllRead } = useNotifications(session.id);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Navegação centralizada: guarda a view anterior (exceto notifications)
  const navigateTo = (id) => {
    if (id !== "notifications") prevViewRef.current = id;
    setView(id);
  };

  // Toggle do sino: abre notificações ou volta para a view anterior
  const handleBellClick = () => {
    if (view === "notifications") {
      setView(prevViewRef.current); // fecha → volta ao ecrã anterior
    } else {
      prevViewRef.current = view;   // guarda onde estava antes de abrir
      setView("notifications");
      markAllRead();
    }
  };

  const navItems    = NAV_ITEMS();
  const bottomItems = BOTTOM_ITEMS();

  const renderView = () => {
    switch (view) {
      case "dashboard":     return <TherapistDashboard  session={session} setView={navigateTo} />;
      case "patients":      return <PatientsView        session={session} />;
      case "exercises":     return <ExercisesView       session={session} />;
      case "create":        return <CreateExerciseView  session={session} onSaved={() => navigateTo("exercises")} onCancel={() => navigateTo("exercises")} />;
      case "progress":      return <TherapistProgress   session={session} />;
      case "responses":     return <ResponsesView       session={session} />;
      case "notifications": return <NotificationsView   session={session} onRead={markAllRead} />;
      default:              return <TherapistDashboard  session={session} setView={navigateTo} />;
    }
  };

  return (
    <div className="layout">
      {/* Sidebar — apenas desktop */}
      {!isMobile && (
        <Sidebar
          brand="Equilibre"
          roleLabel="Psicóloga"
          navItems={navItems}
          activeView={view}
          onNav={navigateTo}
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
          onAvatarClick={() => setShowProfile(true)}
          onLogout={() => setShowLogout(true)}
          onDeleteAccount={() => setShowDelete(true)}
          extraHeader={
            <button
              className="notif-bell"
              aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
              onClick={() => navigateTo("notifications")}
            >
              🔔
              {unreadCount > 0 && (
                <span className="notif-dot" aria-hidden="true">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          }
        />
      )}

      {/* Main content */}
      <main
        className="main"
        style={{ marginLeft: isMobile ? 0 : 256 }}
      >
        {renderView()}
      </main>

      {/* Botão flutuante — apenas mobile */}
      {isMobile && (
        <FloatingBell
          unreadCount={unreadCount}
          isActive={view === "notifications"}
          onClick={handleBellClick}
        />
      )}

      {/* Bottom nav — apenas mobile */}
      {isMobile && (
        <BottomNav
          items={bottomItems}
          activeView={view}
          onNav={navigateTo}
          session={session}
          onAvatarClick={() => setShowProfile(true)}
        />
      )}

      {/* Modais globais */}
      {showProfile && (
        <ProfileModal
          session={session}
          setSession={setSession}
          onClose={() => setShowProfile(false)}
          {...(isMobile && {
            theme,
            toggleTheme,
            onLogout:        () => { setShowProfile(false); setShowLogout(true); },
            onDeleteAccount: () => { setShowProfile(false); setShowDelete(true); },
          })}
        />
      )}
      {showLogout && (
        <LogoutDialog
          onConfirm={logout}
          onCancel={() => setShowLogout(false)}
        />
      )}
      {showDelete && (
        <DeleteAccountModal
          session={session}
          onClose={() => setShowDelete(false)}
          onDeleted={logout}
        />
      )}

      <ToastContainer />
    </div>
  );
}