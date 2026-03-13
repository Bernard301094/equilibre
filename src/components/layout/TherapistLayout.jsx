import { useState, useRef, useCallback, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar        from "./Sidebar";
import BottomNav      from "./BottomNav";
import ToastContainer from "../ui/Toast";
import ProfileModal      from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";
import PatientModal from "../../features/therapist/PatientModal/PatientModal";
import { useNotifications } from "../../hooks/useNotifications";
import { useIsMobile }      from "../../hooks/useIsMobile";
import { THERAPIST_ROUTES } from "../../App";
import "./TherapistLayout.css";

function playNotificationSound() {
  try {
    const audio = new Audio("/notification.wav");
    audio.volume = 0.5;
    audio.play().catch((e) => console.log("[TherapistLayout] Áudio bloqueado:", e.message));
  } catch (_) {}
}

const NAV_ITEMS = [
  { id: "dashboard",   icon: "🏠",  label: "Início"       },
  { id: "patients",    icon: "👥",  label: "Pacientes"    },
  { id: "exercises",   icon: "📚",  label: "Exercícios"   },
  { id: "create",      icon: "✏️",  label: "Criar"        },
  { id: "progress",    icon: "📈",  label: "Progresso"    },
  { id: "responses",   icon: "💬",  label: "Respostas"    },
  { id: "orientacoes", icon: "📬",  label: "Orientações"  },
  { id: "modelos",     icon: "🧩",  label: "Modelos"      },
];

function useBellState(unreadCount) {
  const [animKey,  setAnimKey]  = useState(0);
  const [animType, setAnimType] = useState(null);
  const timerRef     = useRef(null);
  const prevCountRef = useRef(unreadCount);

  const fire = useCallback((type, ms) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnimType(type);
    setAnimKey(k => k + 1);
    timerRef.current = setTimeout(() => { setAnimType(null); timerRef.current = null; }, ms);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) fire('shake', 900);
    prevCountRef.current = unreadCount;
  }, [unreadCount, fire]);

  useEffect(() => {
    if (unreadCount === 0) return;
    const id = setInterval(() => { if (timerRef.current === null) fire('idle', 750); }, 9000);
    return () => clearInterval(id);
  }, [unreadCount, fire]);

  const triggerRing = useCallback(() => fire('ring', 480), [fire]);

  const iconClass = [
    'bell-icon',
    animType === 'shake' ? 'bell-icon--shaking' : '',
    animType === 'ring'  ? 'bell-icon--ringing' : '',
    animType === 'idle'  ? 'bell-icon--idle'    : '',
  ].filter(Boolean).join(' ');

  return { animKey, iconClass, triggerRing };
}

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
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}${isActive ? " — clique para fechar" : ""}`}
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
      aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ""}`}
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

export default function TherapistLayout({ session, setSession, logout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfile, setShowProfile] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);

  const [selectedPatient,    setSelectedPatient]    = useState(null);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  const handleOpenPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setIsPatientModalOpen(true);
  }, []);

  const handleClosePatient = useCallback(() => {
    setIsPatientModalOpen(false);
    setSelectedPatient(null);
  }, []);

  const isMobile    = useIsMobile();
  const prevPathRef = useRef(location.pathname);
  const { unreadCount, markAllRead } = useNotifications(session.id);

  const prevUnreadRef = useRef(-1);
  useEffect(() => {
    if (prevUnreadRef.current === -1) { prevUnreadRef.current = unreadCount; return; }
    if (unreadCount > prevUnreadRef.current) playNotificationSound();
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const navigateTo = useCallback((id) => {
    const path = THERAPIST_ROUTES[id];
    if (!path) return;
    if (id !== "notifications") prevPathRef.current = location.pathname;
    navigate(path);
  }, [navigate, location.pathname]);

  const getActiveView = (path) => {
    const url = path.toLowerCase();
    if (url.includes("paciente") || url.includes("patient")) return "patients";
    if (url.includes("exercicio") || url.includes("exercise")) return "exercises";
    if (url.includes("criar") || url.includes("create")) return "create";
    if (url.includes("progresso") || url.includes("progress")) return "progress";
    if (url.includes("resposta") || url.includes("response")) return "responses";
    if (url.includes("orientaco") || url.includes("orientacoes")) return "orientacoes";
    if (url.includes("notificaco") || url.includes("notification")) return "notifications";
    if (url.includes("modelos")) return "modelos";
    return "dashboard";
  };

  const activeView = getActiveView(location.pathname);

  const handleBellClick = () => {
    if (activeView === "notifications") {
      navigate(prevPathRef.current || THERAPIST_ROUTES.dashboard);
    } else {
      prevPathRef.current = location.pathname;
      navigate(THERAPIST_ROUTES.notifications);
      markAllRead();
    }
  };

  return (
    <div className="therapist-layout">

      {!isMobile && (
        <Sidebar
          brand="Equilibre"
          roleLabel="Psicóloga"
          navItems={NAV_ITEMS}
          activeView={activeView}
          onNav={navigateTo}
          session={session}
          theme={theme}
          toggleTheme={toggleTheme}
          onAvatarClick={() => setShowProfile(true)}
          onLogout={() => setShowLogout(true)}
          onDeleteAccount={() => setShowDelete(true)}
          extraHeader={
            <SidebarBell unreadCount={unreadCount} onClick={handleBellClick} />
          }
        />
      )}

      <main className={`therapist-layout__main${isMobile ? " therapist-layout__main--mobile" : ""}`}>
        <Outlet context={{ session, setSession, navigateTo, onOpenPatient: handleOpenPatient }} />
      </main>

      {isMobile && (
        <FloatingBell
          unreadCount={unreadCount}
          isActive={activeView === "notifications"}
          onClick={handleBellClick}
        />
      )}

      {isMobile && (
        <BottomNav
          items={NAV_ITEMS}
          activeView={activeView}
          onNav={navigateTo}
          session={session}
          onAvatarClick={() => setShowProfile(true)}
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

      {isPatientModalOpen && selectedPatient && (
        <PatientModal
          patient={selectedPatient}
          session={session}
          onClose={handleClosePatient}
        />
      )}

      <ToastContainer />
    </div>
  );
}
