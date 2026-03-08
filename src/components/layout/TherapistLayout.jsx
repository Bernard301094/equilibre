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
      <div
        className="delete-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="delete-icon">👋</div>
        <div className="delete-title">Sair da conta?</div>
        <div className="delete-desc">
          Você precisará fazer login novamente para aceder à plataforma.
        </div>
        <div className="logout-dialog-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>Sair</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FloatingBell — botão flutuante de notificações (mobile only)

   Usa as mesmas classes CSS (.notif-bell, .notif-dot) do App.css
   mais classes BEM semânticas para os estados dinâmicos.
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

  const wrapClass = [
    "floating-bell-wrap",
    isActive                          ? "floating-bell-wrap--active"  : "",
    unreadCount > 0 && !isActive      ? "floating-bell-wrap--unread"  : "",
    shake                             ? "floating-bell-wrap--shaking" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapClass}>
      <button
        className="notif-bell"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}${
          isActive ? " — clique para fechar" : ""
        }`}
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
  );
}

export default function TherapistLayout({ session, setSession, logout, theme, toggleTheme }) {
  const [view,        setView]        = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

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
      setView(prevViewRef.current);
    } else {
      prevViewRef.current = view;
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

      {/* Main content — margin-left gerido pelo CSS (.main + media queries) */}
      <main className={`main${isMobile ? " main--mobile" : ""}`}>
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