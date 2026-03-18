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

function playNotificationSound() {
  try {
    const audio = new Audio("/notification.wav");
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("[PatientLayout] Áudio bloqueado:", e.message));
  } catch (_) {}
}

// "progress" e "history" unificados num único item "history" (com tab Progresso interno)
const buildNavItems = (pendingCount) => [
  { id: "home",        icon: "🏠",  label: "Início"      },
  { id: "exercises",   icon: "📋",  label: "Exercícios", badge: pendingCount },
  { id: "diary",       icon: "📓",  label: "Diário"      },
  { id: "routine",     icon: "🗓️",  label: "Rotina"      },
  { id: "history",     icon: "🕰️", label: "Histórico"   },
  { id: "orientacoes", icon: "📬",  label: "Orientações" },
  { id: "sessions",    icon: "📅",  label: "Sessões"     },
];

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

function useBellState(unreadCount) {
  const [animKey,  setAnimKey]  = useState(0);
  const [animType, setAnimType] = useState(null);
  const timerRef     = useRef(null);
  const prevCountRef = useRef(unreadCount);

  const fire = useCallback((type, ms) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnimType(type);
    setAnimKey((k) => k + 1);
    timerRef.current = setTimeout(() => { setAnimType(null); timerRef.current = null; }, ms);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) fire("shake", 900);
    prevCountRef.current = unreadCount;
  }, [unreadCount, fire]);

  useEffect(() => {
    if (unreadCount === 0) return;
    const id = setInterval(() => { if (timerRef.current === null) fire("idle", 750); }, 9000);
    return () => clearInterval(id);
  }, [unreadCount, fire]);

  const triggerRing = useCallback(() => fire("ring", 480), [fire]);

  const iconClass = [
    "bell-icon",
    animType === "shake" ? "bell-icon--shaking" : "",
    animType === "ring"  ? "bell-icon--ringing" : "",
    animType === "idle"  ? "bell-icon--idle"    : "",
  ].filter(Boolean).join(" ");

  return { animKey, iconClass, triggerRing };
}

function FloatingBell({ unreadCount, isActive, onClick }) {
  const { animKey, iconClass, triggerRing } = useBellState(unreadCount);
  const handleClick = () => { triggerRing(); onClick(); };
  const containerClass = [
    "floating-bell",
    isActive                     ? "floating-bell--active" : "",
    unreadCount > 0 && !isActive ? "floating-bell--unread" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      <button
        className="floating-bell__btn"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} novas)` : ""}${isActive ? " — clique para fechar" : ""}`}
        aria-pressed={isActive}
        onClick={handleClick}
      >
        <span key={animKey} className={iconClass} aria-hidden="true">🔔</span>
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
  const { animKey, iconClass, triggerRing } = useBellState(unreadCount);
  const handleClick = () => { triggerRing(); onClick(); };

  return (
    <button
      className="sidebar-bell"
      aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} novas)` : ""}`}
      onClick={handleClick}
    >
      <span key={animKey} className={iconClass} aria-hidden="true">🔔</span>
      {unreadCount > 0 && (
        <span className="sidebar-bell__badge" aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export default function PatientLayout({ session, setSession, logout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [pendingCount,   setPendingCount]   = useState(0);
  const [unreadFeedback, setUnreadFeedback] = useState(0);
  const [showProfile,    setShowProfile]    = useState(false);
  const [showLogout,     setShowLogout]     = useState(false);
  const [showDelete,     setShowDelete]     = useState(false);

  const isMobile         = useIsMobile();
  const prevPathRef      = useRef(location.pathname);
  const prevTherapistRef = useRef(session.therapist_id);
  const prevFeedbackRef  = useRef(0);

  const notifCount = unreadFeedback;

  useEffect(() => {
    let active = true;

    const fetchCounts = async () => {
      try {
        const [assignRaw, feedbackRaw] = await Promise.all([
          db.query(
            "assignments",
            { filter: { patient_id: session.id, status: "pending" }, select: "id" },
            session.access_token
          ).catch(() => []),
          db.query(
            "therapist_feedback",
            { filter: { patient_id: session.id, read: false }, select: "id,therapist_id" },
            session.access_token
          ).catch(() => []),
        ]);

        if (!active) return;

        const newPending = Array.isArray(assignRaw) ? assignRaw.length : 0;

        const receivedFeedback = Array.isArray(feedbackRaw)
          ? feedbackRaw.filter((f) => f.therapist_id !== session.id)
          : [];
        const newFeedback = receivedFeedback.length;

        if (newFeedback > prevFeedbackRef.current && prevFeedbackRef.current !== -1) {
          playNotificationSound();
        }
        if (prevFeedbackRef.current === -1) prevFeedbackRef.current = newFeedback;
        else prevFeedbackRef.current = newFeedback;

        setPendingCount(newPending);
        setUnreadFeedback(newFeedback);
      } catch (_) {}
    };

    prevFeedbackRef.current = -1;
    fetchCounts();
    const id = setInterval(fetchCounts, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [session.id, session.access_token]);

  useEffect(() => {
    if (!session?.id || !session?.access_token) return;
    const ping = () => {
      db.update("users", { id: session.id }, { last_active: new Date().toISOString() }, session.access_token).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [session?.id, session?.access_token]);

  useEffect(() => {
    if (session.therapist_id === prevTherapistRef.current) return;
    prevTherapistRef.current = session.therapist_id;
    db.query("users", { filter: { id: session.id }, select: "therapist_id,name,avatar_url" }, session.access_token)
      .then((r) => { if (Array.isArray(r) && r.length > 0) setSession((s) => ({ ...s, ...r[0] })); })
      .catch(() => {});
  }, [session.therapist_id, session.id, session.access_token, setSession]);

  const navigateTo = useCallback((id) => {
    const path = PATIENT_ROUTES[id];
    if (!path) return;
    if (id !== "notifications") prevPathRef.current = location.pathname;
    navigate(path);
  }, [navigate, location.pathname]);

  const activeView = PATH_TO_PATIENT_VIEW[location.pathname] ?? "home";
  const navItems   = buildNavItems(pendingCount);

  const handleBellClick = () => {
    if (activeView === "notifications") {
      navigate(prevPathRef.current || PATIENT_ROUTES.home);
    } else {
      prevPathRef.current = location.pathname;
      navigate(PATIENT_ROUTES.notifications);
      setUnreadFeedback(0);
      prevFeedbackRef.current = 0;
    }
  };

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
          extraHeader={
            <SidebarBell unreadCount={notifCount} onClick={handleBellClick} />
          }
        />
      )}

      <main className={[
        "patient-layout__main",
        isMobile ? "patient-layout__main--mobile" : "",
      ].filter(Boolean).join(" ")}>
        <Outlet context={{ session, setSession, navigateTo }} />
      </main>

      {isMobile && (
        <FloatingBell
          unreadCount={notifCount}
          isActive={activeView === "notifications"}
          onClick={handleBellClick}
        />
      )}

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
