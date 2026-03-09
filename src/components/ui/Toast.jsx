import { useState, useEffect, useRef } from "react";
import { toast as toastBus } from "../../utils/toast";
import "./Toast.css";

const ICONS = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
  warning: "⚠️",
};

function ToastItem({ item, onRemove, isDark }) {
  const [visible, setVisible]   = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const timerRef                = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timerRef.current = setTimeout(() => dismiss(), item.duration);
    return () => clearTimeout(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onRemove(item.id), 320);
  };

  /* State classes drive the enter/leave animation */
  const stateClass = leaving
    ? "toast-item--leaving"
    : visible
    ? "toast-item--visible"
    : "";

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={dismiss}
      className={[
        "toast-item",
        `toast-item--${item.type}`,
        isDark ? "toast-item--dark" : "",
        stateClass,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="toast-item__icon" aria-hidden="true">
        {ICONS[item.type]}
      </span>

      <span className="toast-item__message">
        {item.message}
      </span>

      <button
        className="toast-item__close"
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const isDark = document.body.classList.contains("dark-mode");

  useEffect(() => {
    const unsub = toastBus.subscribe((t) =>
      setToasts((prev) => [...prev.slice(-4), t])
    );
    return unsub;
  }, []);

  const remove = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-label="Notificações">
      {toasts.map((t) => (
        <div key={t.id} className="toast-wrapper">
          <ToastItem item={t} onRemove={remove} isDark={isDark} />
        </div>
      ))}
    </div>
  );
}