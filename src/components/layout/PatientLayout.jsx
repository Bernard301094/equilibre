import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import ToastContainer from "../ui/Toast";

// Vistas del paciente
import Home from "../../features/patient/Home";
import RoutineView from "../../features/patient/RoutineView";
import DiaryView from "../../features/patient/DiaryView";
import ExercisesView from "../../features/patient/ExercisesView";
import ProgressView from "../../features/patient/ProgressView";
import HistoryView from "../../features/patient/HistoryView";
import ExercisePage from "../../features/patient/ExercisePage";

// Modales compartidos
import ProfileModal from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";

import "./PatientLayout.css";

const PATIENT_NAV = [
  { id: "home", icon: "🏠", label: "Início" },
  { id: "routine", icon: "🗓️", label: "Rotina" },
  { id: "diary", icon: "📔", label: "Diário" },
  { id: "exercises", icon: "🌱", label: "Práticas" },
  { id: "progress", icon: "📈", label: "Progresso" },
];

function LogoutDialog({ onConfirm, onCancel }) {
  return (
    <div className="patient-logout-overlay" onClick={onCancel}>
      <div className="patient-logout-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="patient-logout-icon">👋</div>
        <div className="patient-logout-title">Sair da conta?</div>
        <div className="patient-logout-desc">Você precisará fazer login novamente para aceder à plataforma.</div>
        <div className="patient-logout-actions">
          <button className="patient-logout-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="patient-logout-btn-confirm" onClick={onConfirm}>Sair</button>
        </div>
      </div>
    </div>
  );
}

export default function PatientLayout({ session, setSession, logout, theme, toggleTheme }) {
  const [view, setView] = useState("home");
  const [showProfile, setShowProfile] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Estado para manejar la vista de un ejercicio activo sin perder la navegación
  const [activeExercise, setActiveExercise] = useState(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const navigateTo = (id) => {
    setActiveExercise(null); // Si navegamos desde el menú, cerramos el ejercicio
    setView(id);
  };

  const startExercise = (exerciseId) => {
    setActiveExercise(exerciseId);
  };

  const renderView = () => {
    // Si hay un ejercicio activo, mostramos su pantalla completa sobre el layout
    if (activeExercise) {
      return (
        <ExercisePage 
          session={session} 
          exerciseId={activeExercise} 
          onBack={() => setActiveExercise(null)} 
        />
      );
    }

    switch (view) {
      case "home":      return <Home session={session} setView={navigateTo} onStartExercise={startExercise} />;
      case "routine":   return <RoutineView session={session} onStartExercise={startExercise} />;
      case "diary":     return <DiaryView session={session} />;
      case "exercises": return <ExercisesView session={session} onStartExercise={startExercise} />;
      case "progress":  return <ProgressView session={session} />;
      case "history":   return <HistoryView session={session} />;
      default:          return <Home session={session} setView={navigateTo} onStartExercise={startExercise} />;
    }
  };

  return (
    <div className="patient-layout-root">
      {/* Sidebar — apenas desktop */}
      {!isMobile && (
        <Sidebar
          brand="Equilibre"
          roleLabel="Paciente"
          navItems={PATIENT_NAV}
          activeView={view}
          onNav={navigateTo}
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
          onAvatarClick={() => setShowProfile(true)}
          onLogout={() => setShowLogout(true)}
          onDeleteAccount={() => setShowDelete(true)}
        />
      )}

      {/* Main content */}
      <main className="patient-main-content">
        {renderView()}
      </main>

      {/* Bottom nav — apenas mobile (se oculta si el paciente está haciendo un ejercicio activo) */}
      {isMobile && !activeExercise && (
        <BottomNav
          navItems={PATIENT_NAV}
          activeView={view}
          onNav={navigateTo}
          session={session}
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