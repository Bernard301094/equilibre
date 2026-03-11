import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar            from "./Sidebar";
import BottomNav          from "./BottomNav";
import ToastContainer     from "../ui/Toast";
import ProfileModal       from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";
import { useIsMobile }    from "../../hooks/useIsMobile";
import db                 from "../../services/db";
import {
  PATIENT_ROUTES,
  PATH_TO_PATIENT_VIEW,
} from "../../App";
import "./PatientLayout.css";

/* ════════════════════════════════════════════════════════════
   NAV ITEMS
   badge dinâmico para exercícios pendentes
   ════════════════════════════════════════════════════════════ */
const buildNavItems = (pendingCount) => [
  { id: "home",        icon: "🏠",  label: "Início"      },
  { id: "exercises",   icon: "📋",  label: "Exercícios",  badge: pendingCount },
  { id: "diary",       icon: "📓",  label: "Diário"      },
  { id: "routine",     icon: "🗓️",  label: "Rotina"      },
  { id: "progress",    icon: "📈",  label: "Progresso"   },
  { id: "history",     icon: "🕰️", label: "Histórico"   },
  { id: "orientacoes", icon: "📬",  label: "Orientações" }, // ← NOVO
];

/* ── LogoutDialog ─────────────────────────────────────────── */
function LogoutDialog({ onConfirm, onCancel }) {
  return (
    <div className="logout-overlay" onClick={onCancel}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="logout-modal__icon">👋</div>
        <div className="logout-modal__title">Sair da conta?</div>
        <div className="logout-modal__desc">Você precisará fazer login novamente para aceder à plataforma.</div>
        <div className="logout-modal__actions">
          <button className="logout-modal__btn logout-modal__btn--cancel"  onClick={onCancel}>Cancelar</button>
          <button className="logout-modal__btn logout-modal__btn--confirm" onClick={onConfirm}>Sair</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PatientLayout
   ════════════════════════════════════════════════════════════ */
export default function PatientLayout({ session, setSession, logout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingCount, setPendingCount] = useState(0);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showLogout,   setShowLogout]   = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);

  const isMobile = useIsMobile();
  const prevTherapistRef = useRef(session.therapist_id);

  /* ── Poll de exercícios pendentes para badge ── */
  useEffect(() => {
    let active = true;
    const fetchPending = async () => {
      try {
        const r = await db.query(
          "assignments",
          { filter: { patient_id: session.id, status: "pending" }, select: "id" },
          session.access_token
        );
        if (active) setPendingCount(Array.isArray(r) ? r.length : 0);
      } catch (_) {}
    };
    fetchPending();
    const id = setInterval(fetchPending, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [session.id, session.access_token]);

  /* ── Sync quando terapeuta vincula ── */
  useEffect(() => {
    if (session.therapist_id === prevTherapistRef.current) return;
    prevTherapistRef.current = session.therapist_id;
    db.query(
      "users",
      { filter: { id: session.id }, select: "therapist_id,name,avatar_url" },
      session.access_token
    )
      .then((r) => { if (Array.isArray(r) && r.length > 0) setSession((s) => ({ ...s, ...r[0] })); })
      .catch(() => {});
  }, [session.therapist_id, session.id, session.access_token, setSession]);

  const navigateTo = useCallback((id) => {
    const path = PATIENT_ROUTES[id];
    if (path) navigate(path);
  }, [navigate]);

  const activeView = PATH_TO_PATIENT_VIEW[location.pathname] ?? "home";

  const navItems = buildNavItems(pendingCount);

  return (
    <div className="patient-layout">

      {!isMobile && (
        <Sidebar
          brand="Equilibre"
          roleLabel="Paciente"
          navItems={navItems}
          activeView={activeView}
          onNav={navigateTo}
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
          onAvatarClick={() => setShowProfile(true)}
          onLogout={() => setShowLogout(true)}
          onDeleteAccount={() => setShowDelete(true)}
          className="patient-layout__sidebar"
        />
      )}

      <main
        className={[
          "patient-layout__main",
          isMobile ? "patient-layout__main--mobile" : "",
        ].filter(Boolean).join(" ")}
      >
        <Outlet context={{ session, setSession, navigateTo }} />
      </main>

      {isMobile && (
        <BottomNav
          items={navItems}
          activeView={activeView}
          onNav={navigateTo}
          session={session}
          onAvatarClick={() => setShowProfile(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

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

      {showLogout && <LogoutDialog onConfirm={logout} onCancel={() => setShowLogout(false)} />}

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