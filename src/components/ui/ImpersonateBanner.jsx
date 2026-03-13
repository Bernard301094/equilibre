// src/components/ui/ImpersonateBanner.jsx
import "./ImpersonateBanner.css";

const LS_ADMIN_BACKUP = "eq_admin_session_backup";

export default function ImpersonateBanner({ setSession }) {
  const backup = localStorage.getItem(LS_ADMIN_BACKUP);
  if (!backup) return null;

  let roleName = "?";
  let roleIcon = "🎭";
  try {
    const parsed = JSON.parse(localStorage.getItem("equilibre_session") || "{}");
    if (parsed.role === "therapist") { roleName = "Terapeuta Teste"; roleIcon = "🧠"; }
    else if (parsed.role === "patient") { roleName = "Paciente Teste"; roleIcon = "🌱"; }
    else { roleName = parsed.role; }
  } catch (_) {}

  const handleReturn = () => {
    const adminSession = JSON.parse(backup);
    localStorage.removeItem(LS_ADMIN_BACKUP);
    setSession(adminSession);
  };

  return (
    <div className="impersonate-banner">
      <span className="impersonate-banner__label">
        {roleIcon} <strong>Dev</strong> — {roleName}
      </span>
      <button className="impersonate-banner__btn" onClick={handleReturn}>
        ← Admin
      </button>
    </div>
  );
}
