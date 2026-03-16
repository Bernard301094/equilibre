import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App";

// ── Bloquear pinch-to-zoom em todos os navegadores mobile ──────────────
// Reforço via JS para Samsung Internet / Chrome Android que ignoram
// user-scalable=no em alguns casos
document.addEventListener(
  "touchmove",
  (e) => { if (e.touches.length > 1) e.preventDefault(); },
  { passive: false }
);
document.addEventListener(
  "gesturestart",
  (e) => e.preventDefault(),
  { passive: false }
);
document.addEventListener(
  "gesturechange",
  (e) => e.preventDefault(),
  { passive: false }
);
document.addEventListener(
  "gestureend",
  (e) => e.preventDefault(),
  { passive: false }
);
// ───────────────────────────────────────────────────────────────────────

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
