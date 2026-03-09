import { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import ToastContainer from "../ui/Toast";
import TherapistDashboard  from "../../features/therapist/Dashboard";
import PatientsView        from "../../features/therapist/PatientsView";
import ExercisesView       from "../../features/therapist/ExercisesView";
import CreateExerciseView  from "../../features/therapist/CreateExerciseView";
import ResponsesView       from "../../features/therapist/ResponsesView";
import TherapistProgress   from "../../features/therapist/TherapistProgress";
import NotificationsView   from "../../features/therapist/NotificationsView";
import ProfileModal        from "../shared/ProfileModal";
import DeleteAccountModal  from "../shared/DeleteAccountModal";
import { useNotifications } from "../../hooks/useNotifications";
import "./TherapistLayout.css";

const NAV_ITEMS = [
  { id: "dashboard",  icon: "🏠", label: "Início"     },
  { id: "patients",   icon: "👥", label: "Pacientes"  },
  { id: "exercises",  icon: "📚", label: "Exercícios" },
  { id: "create",     icon: "✏️",  label: "Criar"      },
  { id: "progress",   icon: "📈", label: "Progresso"  },
  { id: "responses",  icon: "💬", label: "Respostas"  },
];

function LogoutDialog({ onConfirm, onCancel }) {
  return (
    <div className="logout-overlay" onClick={onCancel}>
      <div
        className="logout-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="logout-modal__icon">👋</div>
        <div className="logout-modal__title">Sair da conta?</div>
        <div className="logout-modal__desc">
          Você precisará fazer login novamente para aceder à plataforma.
        </div>
        <div className="logout-modal__actions">
          <button className="logout-modal__btn logout-modal__btn--cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="logout-modal__btn logout-modal__btn--confirm" onClick={onConfirm}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

function FloatingBell({ unreadCount, isActive, onClick }) {
  const [shake, setShake] = useState(false);
  const prevCount = useRef(unreadCount);

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
    "floating-bell",
    isActive                     ? "floating-bell--active"  : "",
    unreadCount > 0 && !isActive ? "floating-bell--unread"  : "",
    shake                        ? "floating-bell--shaking" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapClass}>
      <button
        className="floating-bell__btn"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}${
          isActive ? " — clique para fechar" : ""
        }`}
        aria-pressed={isActive}
        onClick={onClick}
      >
        🔔
        {unreadCount > 0 && (
          <span className="floating-bell__badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

function SidebarBell({ unreadCount, onClick }) {
  return (
    <button
      className="sidebar-bell"
      aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
      onClick={onClick}
    >
      🔔
      {unreadCount > 0 && (
        <span className="sidebar-bell__badge" aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export default function TherapistLayout({ session, setSession, logout, theme, toggleTheme }) {
  const [view,        setView]        = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(() => window.innerWidth < 768);

  const prevViewRef = useRef("dashboard");
  const { unreadCount, markAllRead } = useNotifications(session.id);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const navigateTo = (id) => {
    if (id !== "notifications") prevViewRef.current = id;
    setView(id);
  };

  const handleBellClick = () => {
    if (view === "notifications") {
      setView(prevViewRef.current);
    } else {
      prevViewRef.current = view;
      setView("notifications");
      markAllRead();
    }
  };

  const renderView = () => {
    switch (view) {
      case "dashboard":     return <TherapistDashboard session={session} setView={navigateTo} />;
      case "patients":      return <PatientsView       session={session} />;
      case "exercises":     return <ExercisesView      session={session} />;
      case "create":        return <CreateExerciseView session={session} onSaved={() => navigateTo("exercises")} onCancel={() => navigateTo("exercises")} />;
      case "progress":      return <TherapistProgress  session={session} />;
      case "responses":     return <ResponsesView      session={session} />;
      case "notifications": return <NotificationsView  session={session} onRead={markAllRead} />;
      default:              return <TherapistDashboard session={session} setView={navigateTo} />;
    }
  };

  return (
    <div className="therapist-layout">

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <Sidebar
          brand="Equilibre"
          roleLabel="Psicóloga"
          navItems={NAV_ITEMS}
          activeView={view}
          onNav={navigateTo}
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
          onAvatarClick={() => setShowProfile(true)}
          onLogout={() => setShowLogout(true)}
          onDeleteAccount={() => setShowDelete(true)}
          extraHeader={
            <SidebarBell
              unreadCount={unreadCount}
              onClick={() => navigateTo("notifications")}
            />
          }
        />
      )}

      {/* Main content */}
      <main className={`therapist-layout__main${isMobile ? " therapist-layout__main--mobile" : ""}`}>
        {renderView()}
      </main>

      {/* Floating bell — mobile only */}
      {isMobile && (
        <FloatingBell
          unreadCount={unreadCount}
          isActive={view === "notifications"}
          onClick={handleBellClick}
        />
      )}

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <BottomNav
          items={NAV_ITEMS}
          activeView={view}
          onNav={navigateTo}
          session={session}
          onAvatarClick={() => setShowProfile(true)}
        />
      )}

      {/* Global modals */}
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