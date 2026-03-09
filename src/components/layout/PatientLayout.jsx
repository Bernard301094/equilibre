import { useState, useEffect, useRef } from "react";
import Sidebar            from "./Sidebar";
import BottomNav          from "./BottomNav";
import ToastContainer     from "../ui/Toast";
import PatientHome        from "../../features/patient/Home";
import PatientExercises   from "../../features/patient/PatientExercises";
import ExercisePage       from "../../features/patient/ExercisePage";
import PatientDiary       from "../../features/patient/DiaryView";
import PatientRoutine     from "../../features/patient/RoutineView";
import PatientProgress    from "../../features/patient/PatientProgress";
import PatientHistory     from "../../features/patient/PatientHistory";
import ProfileModal       from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";
import db from "../../services/db";

const NAV_ITEMS = (pendingCount) => [
  { id: "home",      icon: "🏠", label: "Início"    },
  { id: "exercises", icon: "📋", label: "Exercícios", badge: pendingCount },
  { id: "diary",     icon: "📓", label: "Diário"    },
  { id: "routine",   icon: "🗓️", label: "Rotina"    },
  { id: "progress",  icon: "📈", label: "Progresso" },
  { id: "history",   icon: "🕰️", label: "Histórico" },
];

// Mobile recebe todos os itens — o BottomNav cuida da divisão fixos + drawer "Mais"
const BOTTOM_ITEMS = (pendingCount) => [
  { id: "home",      icon: "🏠", label: "Início"    },
  { id: "exercises", icon: "📋", label: "Exercícios", badge: pendingCount },
  { id: "diary",     icon: "📓", label: "Diário"    },
  { id: "routine",   icon: "🗓️", label: "Rotina"    },
  { id: "progress",  icon: "📈", label: "Progresso" },
  { id: "history",   icon: "🕰️", label: "Histórico" },
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

export default function PatientLayout({ session, setSession, logout, theme, toggleTheme }) {
  const [view,           setView]           = useState("home");
  const [activeExercise, setActiveExercise] = useState(null);
  const [pendingCount,   setPendingCount]   = useState(0);
  const [showProfile,    setShowProfile]    = useState(false);
  const [showLogout,     setShowLogout]     = useState(false);
  const [showDelete,     setShowDelete]     = useState(false);
  const [isMobile,       setIsMobile]       = useState(window.innerWidth < 768);

  const prevTherapistRef = useRef(session.therapist_id);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Poll pending assignments for badge
  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const r = await db.query(
          "assignments",
          { filter: { patient_id: session.id, status: "pending" }, select: "id" },
          session.access_token
        );
        if (active) setPendingCount(Array.isArray(r) ? r.length : 0);
      } catch (_) {}
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [session.id, session.access_token]);

  // Sync session if therapist linked
  useEffect(() => {
    if (session.therapist_id === prevTherapistRef.current) return;
    prevTherapistRef.current = session.therapist_id;
    db.query("users", { filter: { id: session.id }, select: "therapist_id,name,avatar_url" }, session.access_token)
      .then((r) => {
        if (Array.isArray(r) && r.length > 0) setSession((s) => ({ ...s, ...r[0] }));
      })
      .catch(() => {});
  }, [session.therapist_id, session.id, session.access_token, setSession]);

  const navItems    = NAV_ITEMS(pendingCount);
  const bottomItems = BOTTOM_ITEMS(pendingCount);

  // Full-screen exercise page
  if (activeExercise) {
    return (
      <ExercisePage
        exercise={activeExercise}
        session={session}
        onBack={() => { setActiveExercise(null); setView("exercises"); }}
      />
    );
  }

  const renderView = () => {
    switch (view) {
      case "home":      return <PatientHome      session={session} setSession={setSession} setView={setView} />;
      case "exercises": return <PatientExercises session={session} onStart={setActiveExercise} />;
      case "diary":     return <PatientDiary     session={session} />;
      case "routine":   return <PatientRoutine   session={session} />;
      case "progress":  return <PatientProgress  session={session} />;
      case "history":   return <PatientHistory   session={session} />;
      default:          return <PatientHome      session={session} setSession={setSession} setView={setView} />;
    }
  };

  return (
    <div className="layout">
      {/* Sidebar — apenas desktop */}
      {!isMobile && (
        <Sidebar
          brand="Equilibre"
          roleLabel="Paciente"
          navItems={navItems}
          activeView={view}
          onNav={setView}
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
          onAvatarClick={() => setShowProfile(true)}
          onLogout={() => setShowLogout(true)}
          onDeleteAccount={() => setShowDelete(true)}
          className="patient-sidebar"
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