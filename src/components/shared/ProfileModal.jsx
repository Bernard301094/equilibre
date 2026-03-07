import { useRef, useState } from "react";
import Modal from "../ui/Modal";
import db from "../../services/db";
import storage from "../../services/storage";
import AvatarDisplay from "./AvatarDisplay";

/**
 * Modal to view and change the user's profile photo.
 * On mobile, also exposes system actions (theme, logout, delete account)
 * since the Sidebar that normally holds them is hidden.
 *
 * Props:
 *   session           — current session object
 *   setSession        — session updater from useSession
 *   onClose
 *   theme             — 'light' | 'dark'  (optional, passed on mobile)
 *   toggleTheme       — () => void         (optional, passed on mobile)
 *   onLogout          — () => void         (optional, passed on mobile)
 *   onDeleteAccount   — () => void         (optional, passed on mobile)
 */
export default function ProfileModal({
  session,
  setSession,
  onClose,
  theme,
  toggleTheme,
  onLogout,
  onDeleteAccount,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const fileInputRef              = useRef(null);
  const labelId                   = "profile-modal-title";

  const hasSystemActions = toggleTheme || onLogout || onDeleteAccount;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const avatarUrl = await storage.uploadAvatar(
        file,
        session.id,
        session.access_token
      );
      await db.update(
        "users",
        { id: session.id },
        { avatar_url: avatarUrl },
        session.access_token
      );
      setSession((prev) => ({ ...prev, avatar_url: avatarUrl }));
      onClose();
    } catch (err) {
      setError(err.message || "Erro ao atualizar foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={320} labelId={labelId}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 24px 20px" }}>
        <h3 id={labelId} style={{ marginBottom: 24, fontSize: 17, textAlign: "center" }}>
          Foto de Perfil
        </h3>

        {/* Avatar — centralizado via flex no contêiner pai */}
        <AvatarDisplay
          name={session.name}
          avatarUrl={session.avatar_url}
          size={100}
          onClick={() => fileInputRef.current?.click()}
          title="Carregar nova foto"
        />

        {error && (
          <p
            style={{ color: "#c0444a", fontSize: 13, margin: "14px 0 0", textAlign: "center" }}
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          id="avatar-file-input"
          onChange={handleFileChange}
          aria-label="Selecionar foto de perfil"
        />

        <button
          className="btn btn-sage"
          style={{ width: "100%", marginTop: 20, marginBottom: 10, textAlign: "center", justifyContent: "center" }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? "A carregar..." : "Carregar Nova Foto"}
        </button>

        <button
          className="btn btn-outline"
          style={{ width: "100%", textAlign: "center", justifyContent: "center" }}
          onClick={onClose}
        >
          Fechar
        </button>

        {/* ── Ações de sistema — só renderizadas no mobile (quando as props são injetadas) ── */}
        {hasSystemActions && (
          <>
            <div style={{ width: "100%", margin: "20px 0 16px", borderTop: "1px solid var(--warm)" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>

              {/* Alternar tema */}
              {toggleTheme && (
                <button
                  className="btn btn-outline"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                >
                  <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </button>
              )}

              {/* Encerrar sessão */}
              {onLogout && (
                <button
                  className="btn btn-outline"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  onClick={() => { onClose(); onLogout(); }}
                  aria-label="Encerrar sessão"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sair da Conta
                </button>
              )}

              {/* Excluir conta */}
              {onDeleteAccount && (
                <button
                  className="btn btn-danger"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}
                  onClick={() => { onClose(); onDeleteAccount(); }}
                  aria-label="Excluir conta permanentemente"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Excluir Conta
                </button>
              )}

            </div>
          </>
        )}
      </div>
    </Modal>
  );
}