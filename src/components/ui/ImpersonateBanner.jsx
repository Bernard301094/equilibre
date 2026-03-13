const LS_ADMIN_BACKUP = "eq_admin_session_backup";

export default function ImpersonateBanner({ setSession }) {
  const backup = localStorage.getItem(LS_ADMIN_BACKUP);
  if (!backup) return null;

  let roleName = "?";
  try {
    const parsed = JSON.parse(localStorage.getItem("equilibre_session") || "{}");
    roleName = parsed.role === "therapist" ? "Terapeuta Teste" : parsed.role === "patient" ? "Paciente Teste" : parsed.role;
  } catch (_) {}

  const handleReturn = () => {
    const adminSession = JSON.parse(backup);
    localStorage.removeItem(LS_ADMIN_BACKUP);
    setSession(adminSession);
  };

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
      background: "#1e293b", color: "white", borderRadius: "12px",
      padding: "12px 20px", display: "flex", alignItems: "center", gap: "14px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600,
    }}>
      <span>🎭 Dev — visualizando como <strong>{roleName}</strong></span>
      <button
        onClick={handleReturn}
        style={{
          background: "#7c3aed", color: "white", border: "none",
          borderRadius: "8px", padding: "8px 16px", cursor: "pointer",
          fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap",
        }}
      >
        ← Voltar ao Admin
      </button>
    </div>
  );
}
