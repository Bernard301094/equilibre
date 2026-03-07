import { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import ProfileModal from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";
import { useNotifications } from "../../hooks/useNotifications";

// ── Feature views (lazy-friendly flat imports) ────────────────────────────────
import TherapistDashboard from "../../features/therapist/Dashboard";
import PatientsView from "../../features/therapist/PatientsView";
import ExercisesView from "../../features/therapist/ExercisesView";
import CreateExerciseView from "../../features/therapist/CreateExerciseView";
import ResponsesView from "../../features/therapist/ResponsesView";
import TherapistProgress from "../../features/therapist/ProgressView";
import NotificationsView from "../../features/therapist/NotificationsView";

const NAV_ITEMS = [
  { id: "dashboard", icon: "📊", label: "Início" },
  { id: "patients",  icon: "👥", label: "Pacientes" },
  { id: "exercises", icon: "📚", label: "Exercícios" },
  { id: "create",    icon: "✍️",  label: "Criar Exercício" },
  { id: "progress",  icon: "📈", label: "Progresso" },
  { id: "responses", icon: "📥", label: "Respostas" },
];

/**
 * Props:
 *   session, setSession, updateSession, logout
 *   view, setView
 *   toggleTheme, theme
 */
export default function TherapistLayout({
  session,
  setSession,
  updateSession,
  logout,
  view,
  setView,
  toggleTheme,
  theme,
}) {
  const [showProfile,  setShowProfile]  = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);
  const [showLogout,   setShowLogout]   = useState(false);
  const [patientModal, setPatientModal] = useState(null); // { patient }

  const { unreadCount, markAllRead } = useNotifications(session.id);

  const handleNav = useCallback(
    (id) => setView(id),
    [setView]
  );

  const handleNotifClick = useCallback(
    () => setView("notifications"),
    [setView]
  );

  // Bell button for the sidebar header
  const notifBell = (
    <button
      className="notif-bell"
      onClick={handleNotifClick}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notificações não lidas`
          : "Notificações"
      }
      title="Notificações"
    >
      🔔
      {unreadCount > 0 && (
        <span className="notif-dot" aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <div className="layout">
      <Sidebar
        brand="Equilibre"
        roleLabel="Área da Psicóloga"
        navItems={NAV_ITEMS}
        activeView={view === "edit" ? "create" : view}
        onNav={handleNav}
        session={session}
        theme={theme}
        toggleTheme={toggleTheme}
        onAvatarClick={() => setShowProfile(true)}
        onLogout={() => setShowLogout(true)}
        onDeleteAccount={() => setShowDelete(true)}
        extraHeader={notifBell}
      />

      <main className="main" id="main-content">
        {view === "dashboard" && (
          <TherapistDashboard session={session} setView={setView} />
        )}
        {view === "patients" && (
          <PatientsView
            session={session}
            onManagePatient={(patient) => setPatientModal({ patient })}
          />
        )}
        {(view === "exercises" || view === "edit") && (
          <ExercisesView session={session} setView={setView} />
        )}
        {view === "create" && (
          <CreateExerciseView
            session={session}
            onSaved={() => setView("exercises")}
          />
        )}
        {view === "progress" && (
          <TherapistProgress session={session} />
        )}
        {view === "responses" && (
          <ResponsesView session={session} />
        )}
        {view === "notifications" && (
          <NotificationsView
            session={session}
            onRead={markAllRead}
          />
        )}
      </main>

      {/* ── Modals ── */}
      {patientModal && (
        // PatientModal is imported inside PatientsView to keep this file lean.
        // We re-export the trigger via onManagePatient above.
        // The modal itself is rendered by PatientsView for now.
        // This slot is reserved for future extraction.
        null
      )}

      {showProfile && (
        <ProfileModal
          session={session}
          setSession={setSession}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showDelete && (
        <DeleteAccountModal
          session={session}
          onClose={() => setShowDelete(false)}
          onDeleted={() => {
            localStorage.clear();
            setSession(null);
          }}
        />
      )}

      {showLogout && (
        <LogoutDialog
          onConfirm={logout}
          onClose={() => setShowLogout(false)}
        />
      )}
    </div>
  );
}

// ── Inline logout confirmation (small, no need for a separate file) ────────────
function LogoutDialog({ onConfirm, onClose }) {
  return (
    <div
      className="delete-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="delete-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
      >
        <div
          className="delete-icon"
          style={{ fontSize: 42, marginBottom: 16 }}
          aria-hidden="true"
        >
          👋
        </div>
        <div
          id="logout-title"
          className="delete-title"
          style={{ fontSize: 20 }}
        >
          Encerrar sessão?
        </div>
        <div
          className="delete-desc"
          style={{ marginBottom: 24, fontSize: 14 }}
        >
          Tem certeza que deseja sair da sua conta?
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-sage" onClick={onConfirm}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}