import { useState, useEffect, useCallback } from "react";
import "./ConnectionToast.css";

/**
 * ConnectionToast
 *
 * Listens to:
 *  - window "online" / "offline" browser events
 *  - window "equilibre-sync-status" custom event from db.js
 *
 * Mount once at the app root, e.g. inside App.jsx:
 *   <ConnectionToast />
 */

const STATES = {
  online:   null,                            // silent — normal state
  offline:  { icon: "📡", label: "Sem conexão",            sub: "Suas alterações serão salvas quando voltar.",  type: "warn",    persist: true  },
  syncing:  { icon: "🔄", label: "Sincronizando…",         sub: null,                                           type: "info",    persist: true  },
  synced:   { icon: "✅", label: "Tudo sincronizado!",     sub: null,                                           type: "success", persist: false },
  error:    { icon: "⚠️", label: "Erro ao sincronizar",    sub: "Tentaremos de novo mais tarde.",               type: "error",   persist: false },
};

const AUTO_DISMISS_MS = 3500;

export default function ConnectionToast() {
  const [current, setCurrent] = useState(null); // key of STATES
  const [visible,  setVisible]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const dismissTimer = useCallback((delay) => {
    return setTimeout(() => {
      setLeaving(true);
      setTimeout(() => { setVisible(false); setLeaving(false); }, 350);
    }, delay);
  }, []);

  useEffect(() => {
    let autoTimer = null;

    const show = (key) => {
      clearTimeout(autoTimer);
      setLeaving(false);
      setCurrent(key);
      setVisible(true);
      if (!STATES[key]?.persist) {
        autoTimer = dismissTimer(AUTO_DISMISS_MS);
      }
    };

    const onOffline = () => show("offline");
    const onOnline  = () => {
      // "syncing" will be dispatched by db.js once flush starts
      // If there's nothing queued the offline toast just disappears
      show("online");
      setVisible(false);
    };
    const onSyncStatus = (e) => {
      const { status } = e.detail ?? {};
      if (status === "syncing") show("syncing");
      if (status === "synced")  show("synced");
      if (status === "error")   show("error");
    };

    window.addEventListener("offline",               onOffline);
    window.addEventListener("online",                onOnline);
    window.addEventListener("equilibre-sync-status", onSyncStatus);

    // Initialise if already offline
    if (!navigator.onLine) show("offline");

    return () => {
      clearTimeout(autoTimer);
      window.removeEventListener("offline",               onOffline);
      window.removeEventListener("online",                onOnline);
      window.removeEventListener("equilibre-sync-status", onSyncStatus);
    };
  }, [dismissTimer]);

  if (!visible || !current || !STATES[current]) return null;

  const { icon, label, sub, type } = STATES[current];

  return (
    <div
      className={[
        "ct-toast",
        `ct-toast--${type}`,
        leaving ? "ct-toast--leave" : "ct-toast--enter",
      ].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="ct-toast__icon" aria-hidden="true">{icon}</span>
      <div className="ct-toast__body">
        <span className="ct-toast__label">{label}</span>
        {sub && <span className="ct-toast__sub">{sub}</span>}
      </div>
      {STATES[current]?.persist && (
        <button
          className="ct-toast__close"
          onClick={() => {
            setLeaving(true);
            setTimeout(() => { setVisible(false); setLeaving(false); }, 350);
          }}
          aria-label="Fechar aviso"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
}