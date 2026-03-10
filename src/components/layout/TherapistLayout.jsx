import { useState, useRef, useCallback, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Sidebar        from "./Sidebar";
import BottomNav      from "./BottomNav";
import ToastContainer from "../ui/Toast";
import ProfileModal      from "../shared/ProfileModal";
import DeleteAccountModal from "../shared/DeleteAccountModal";
import { useNotifications } from "../../hooks/useNotifications";
import { useIsMobile }      from "../../hooks/useIsMobile";
import {
  THERAPIST_ROUTES,
  PATH_TO_THERAPIST_VIEW,
} from "../../App";
import "./TherapistLayout.css";

/* ════════════════════════════════════════════════════════════
   MAPA DE NAVEGAÇÃO

   Por que manter `id` e não usar as URLs diretamente no
   Sidebar/BottomNav?
   ─────────────────────────────────────────────────────────
   Esses componentes foram construídos com a interface:
     activeView: string (ex: "dashboard")
     onNav:      (id: string) => void

   Manter essa interface evita reescrever Sidebar e BottomNav.
   A tradução id ↔ URL fica exclusivamente neste layout:

     navigateTo("patients")         → navigate("/terapeuta/pacientes")
     "/terapeuta/pacientes" no URL  → activeView = "patients"
   ════════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: "dashboard",  icon: "🏠", label: "Início"     },
  { id: "patients",   icon: "👥", label: "Pacientes"  },
  { id: "exercises",  icon: "📚", label: "Exercícios" },
  { id: "create",     icon: "✏️",  label: "Criar"      },
  { id: "progress",   icon: "📈", label: "Progresso"  },
  { id: "responses",  icon: "💬", label: "Respostas"  },
];

/* ════════════════════════════════════════════════════════════
   useBellState — física de pêndulo (inalterado)
   ════════════════════════════════════════════════════════════ */
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

/* ── FloatingBell ─────────────────────────────────────────── */
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

/* ── SidebarBell ──────────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════
   TherapistLayout
   ════════════════════════════════════════════════════════════ */
export default function TherapistLayout({ session, setSession, logout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfile, setShowProfile] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);

  const isMobile    = useIsMobile();
  const prevPathRef = useRef(location.pathname);
  const { unreadCount, markAllRead } = useNotifications(session.id);

  /*
    navigateTo(id) — view ID → URL → navigate()
    Interface compatível com Sidebar e BottomNav.
  */
  const navigateTo = useCallback((id) => {
    const path = THERAPIST_ROUTES[id];
    if (!path) return;
    if (id !== "notifications") prevPathRef.current = location.pathname;
    navigate(path);
  }, [navigate, location.pathname]);

  /*
    activeView — URL atual → view ID
    Garante que o item correto fique destacado no Sidebar/BottomNav
    mesmo após F5, link direto ou botão Voltar do browser.
  */
  const activeView = PATH_TO_THERAPIST_VIEW[location.pathname] ?? "dashboard";

  /* Bell: toggle notificações ↔ tela anterior */
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

      {/*
        <Outlet /> injeta a view filha correspondente à URL atual.
        context disponibiliza session e navigateTo para as views
        filhas via useOutletContext() se necessário.
      */}
      <main className={`therapist-layout__main${isMobile ? " therapist-layout__main--mobile" : ""}`}>
        <Outlet context={{ session, setSession, navigateTo }} />
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

      <ToastContainer />
    </div>
  );
}