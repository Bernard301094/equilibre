import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import ProfileModal from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";
import db from "../../services/db";

// ── Feature views ─────────────────────────────────────────────────────────────
import PatientHome from "../../features/patient/Home";
import PatientExercises from "../../features/patient/ExercisesView";
import ExercisePage from "../../features/patient/ExercisePage";
import PatientDiary from "../../features/patient/DiaryView";
import PatientRoutine from "../../features/patient/RoutineView";
import PatientProgress from "../../features/patient/ProgressView";
import PatientHistory from "../../features/patient/HistoryView";

const NAV_ITEMS = [
  { id: "home",      icon: "🏠", label: "Início" },
  { id: "routine",   icon: "🗓️", label: "Minha Rotina" },
  { id: "exercises", icon: "📝", label: "Meus Exercícios" },
  { id: "diary",     icon: "📖", label: "Diário" },
  { id: "progress",  icon: "📈", label: "Meu Progresso" },
  { id: "history",   icon: "🕰️", label: "Histórico" },
];

/**
 * Props:
 *   session, setSession, updateSession, logout
 *   view, setView
 *   toggleTheme, theme
 */
export default function PatientLayout({
  session,
  setSession,
  updateSession,
  logout,
  view,
  setView,
  toggleTheme,
  theme,
}) {
  const [showProfile,     setShowProfile]     = useState(false);
  const [showDelete,      setShowDelete]      = useState(false);
  const [showLogout,      setShowLogout]      = useState(false);
  const [activeExercise,  setActiveExercise]  = useState(null);
  const [pendingCount,    setPendingCount]    = useState(0);

  // ── Keep session in sync if the user row changed (e.g. therapist linked) ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.query("users", {
          filter: { email: session.email },
        });
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          const fresh = rows[0];
          if (fresh.id !== session.id || fresh.therapist_id !== session.therapist_id) {
            updateSession(fresh);
          }
        }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [session.email]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll pending exercise count for sidebar badge ─────────────────────────
  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const rows = await db.query("assignments", {
          filter: { patient_id: session.id, status: "pending" },
          select: "id",
        });
        if (active) setPendingCount(Array.isArray(rows) ? rows.length : 0);
      } catch (_) {}
    };
    fetch();
    const id = setInterval(fetch, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [session.id]);

  const handleNav = useCallback(
    (id) => {
      setActiveExercise(null);
      setView(id);
    },
    [setView]
  );

  // Build nav items with badge
  const navItems = NAV_ITEMS.map((n) =>
    n.id === "exercises" ? { ...n, badge: pendingCount } : n
  );

  // ── If an exercise is open, render the full-screen exercise page ──────────
  if (activeExercise) {
    return (
      <ExercisePage
        exercise={activeExercise}
        session={session}
        onBack={() => {
          setActiveExercise(null);
          setView("exercises");
        }}
      />
    );
  }

  return (
    <div className="layout">
      <Sidebar
        brand="Equilibre"
        roleLabel="Área do Paciente"
        navItems={navItems}
        activeView={view}
        onNav={handleNav}
        session={session}
        theme={theme}
        toggleTheme={toggleTheme}
        onAvatarClick={() => setShowProfile(true)}
        onLogout={() => setShowLogout(true)}
        onDeleteAccount={() => setShowDelete(true)}
      />

      <main className="main" id="main-content">
        {view === "home" && (
          <PatientHome
            session={session}
            setSession={setSession}
            setView={setView}
          />
        )}
        {view === "routine" && <PatientRoutine session={session} />}
        {view === "exercises" && (
          <PatientExercises
            session={session}
            onStart={setActiveExercise}
          />
        )}
        {view === "diary" && <PatientDiary session={session} />}
        {view === "progress" && <PatientProgress session={session} />}
        {view === "history" && <PatientHistory session={session} />}
      </main>

      {/* ── Modals ── */}
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

// ── Inline logout confirmation ────────────────────────────────────────────────
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