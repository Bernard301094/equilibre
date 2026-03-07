import { useState, useEffect, useRef } from "react";
import { toast as toastBus } from "../../utils/toast";

const ICONS = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
  warning: "⚠️",
};

const COLORS = {
  success: { bg: "#1a5c28", light: "#d4edd9", border: "#a0d4ac", text: "#1a5c28" },
  error:   { bg: "#8b1c1c", light: "#fde8e8", border: "#f9caca", text: "#8b1c1c" },
  info:    { bg: "#17527c", light: "#ddf0fb", border: "#b3d7ed", text: "#17527c" },
  warning: { bg: "#7a4800", light: "#fff3dd", border: "#ffe0a0", text: "#7a4800" },
};

const DARK_COLORS = {
  success: { bg: "rgba(40,160,80,0.18)",  border: "rgba(40,160,80,0.35)",  text: "#5de88a" },
  error:   { bg: "rgba(224,96,96,0.18)",  border: "rgba(224,96,96,0.35)",  text: "#e88888" },
  info:    { bg: "rgba(127,196,232,0.18)",border: "rgba(127,196,232,0.35)",text: "#7fc4e8" },
  warning: { bg: "rgba(245,162,74,0.18)", border: "rgba(245,162,74,0.35)", text: "#f5c07a" },
};

function ToastItem({ item, onRemove, isDark }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // Enter
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss
    timerRef.current = setTimeout(() => dismiss(), item.duration);
    return () => clearTimeout(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onRemove(item.id), 320);
  };

  const palette = isDark ? DARK_COLORS[item.type] : COLORS[item.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={dismiss}
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            12,
        padding:        "13px 16px",
        borderRadius:   14,
        border:         `1.5px solid ${palette.border}`,
        background:     isDark ? palette.bg : palette.light,
        boxShadow:      "0 8px 28px rgba(0,0,0,0.14)",
        cursor:         "pointer",
        userSelect:     "none",
        maxWidth:       360,
        width:          "100%",
        backdropFilter: "blur(8px)",

        /* Entrada/saída */
        opacity:    visible && !leaving ? 1 : 0,
        transform:  visible && !leaving ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)",
        transition: leaving
          ? "opacity .3s ease, transform .3s ease"
          : "opacity .3s cubic-bezier(0.22,1,0.36,1), transform .35s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">
        {ICONS[item.type]}
      </span>

      <span style={{
        flex:       1,
        fontSize:   13,
        fontWeight: 600,
        color:      palette.text,
        lineHeight: 1.4,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {item.message}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Fechar notificação"
        style={{
          background: "transparent",
          border:     "none",
          cursor:     "pointer",
          fontSize:   16,
          color:      palette.text,
          opacity:    0.5,
          padding:    "0 2px",
          lineHeight: 1,
          flexShrink: 0,
          transition: "opacity .15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
        onMouseLeave={(e) => e.currentTarget.style.opacity = .5}
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
      setToasts((prev) => [...prev.slice(-4), t]) // max 5 ao mesmo tempo
    );
    return unsub;
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div
  aria-label="Notificações"
  className="toast-container"
  style={{
    position:      "fixed",
    bottom:        28,
    right:         28,
    zIndex:        9999,
    display:       "flex",
    flexDirection: "column",
    gap:           10,
    alignItems:    "flex-end",
    pointerEvents: "none",
  }}
>
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem item={t} onRemove={remove} isDark={isDark} />
        </div>
      ))}
    </div>
  );
}