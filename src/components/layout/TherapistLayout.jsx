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

const NAV_ITEMS = (unread) => [
  { id: "dashboard",     icon: "🏠", label: "Início"     },
  { id: "patients",      icon: "👥", label: "Pacientes"  },
  { id: "exercises",     icon: "📚", label: "Exercícios" },
  { id: "create",        icon: "✏️",  label: "Criar"      },
  { id: "progress",      icon: "📈", label: "Progresso"  },
  { id: "responses",     icon: "💬", label: "Respostas"  },
  { id: "notifications", icon: "🔔", label: "Alertas", badge: unread },
];

// Bottom nav shows only the most important 4 + profile
const BOTTOM_ITEMS = (unread) => [
  { id: "dashboard",     icon: "🏠", label: "Início"     },
  { id: "patients",      icon: "👥", label: "Pacientes"  },
  { id: "responses",     icon: "💬", label: "Respostas"  },
  { id: "notifications", icon: "🔔", label: "Alertas", badge: unread },
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

export default function TherapistLayout({ session, setSession, logout, theme, toggleTheme }) {
  const [view,          setView]          = useState("dashboard");
  const [showProfile,   setShowProfile]   = useState(false);
  const [showLogout,    setShowLogout]    = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);

  const { unreadCount, markAllRead } = useNotifications(session.id);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const navItems    = NAV_ITEMS(unreadCount);
  const bottomItems = BOTTOM_ITEMS(unreadCount);

  const renderView = () => {
    switch (view) {
      case "dashboard":     return <TherapistDashboard  session={session} setView={setView} />;
      case "patients":      return <PatientsView        session={session} />;
      case "exercises":     return <ExercisesView       session={session} />;
      case "create":        return <CreateExerciseView  session={session} onSaved={() => setView("exercises")} onCancel={() => setView("exercises")} />;
      case "progress":      return <TherapistProgress   session={session} />;
      case "responses":     return <ResponsesView       session={session} />;
      case "notifications": return <NotificationsView   session={session} onRead={markAllRead} />;
      default:              return <TherapistDashboard  session={session} setView={setView} />;
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
          onNav={setView}
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
              onClick={() => setView("notifications")}
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

      {/* Bottom nav — apenas mobile */}
      {isMobile && (
        <BottomNav
          items={bottomItems}
          activeView={view}
          onNav={setView}
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