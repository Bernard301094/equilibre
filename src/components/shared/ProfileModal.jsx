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
  const [error,     setError]     = useState("");
  const fileInputRef              = useRef(null);
  const labelId                   = "profile-modal-title";

  const hasSystemActions = toggleTheme || onLogout || onDeleteAccount;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const avatarUrl = await storage.uploadAvatar(file, session.id, session.access_token);
      await db.update("users", { id: session.id }, { avatar_url: avatarUrl }, session.access_token);
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
      <div className="pm-body">

        <h3 id={labelId} className="pm-title">
          Foto de Perfil
        </h3>

        {/* Avatar */}
        <AvatarDisplay
          name={session.name}
          avatarUrl={session.avatar_url}
          size={100}
          onClick={() => fileInputRef.current?.click()}
          title="Carregar nova foto"
        />

        {error && (
          <p className="pm-error" role="alert">
            {error}
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="pm-file-input"
          id="avatar-file-input"
          onChange={handleFileChange}
          aria-label="Selecionar foto de perfil"
        />

        <button
          className="btn btn-sage pm-btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? "A carregar..." : "Carregar Nova Foto"}
        </button>

        <button
          className="btn btn-outline pm-btn-close"
          onClick={onClose}
        >
          Fechar
        </button>

        {/* System actions — only rendered on mobile (when props are injected) */}
        {hasSystemActions && (
          <>
            <div className="pm-divider" />

            <div className="pm-system-actions">

              {toggleTheme && (
                <button
                  className="btn btn-outline pm-system-btn"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
                >
                  <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </button>
              )}

              {onLogout && (
                <button
                  className="btn btn-outline pm-system-btn"
                  onClick={() => { onClose(); onLogout(); }}
                  aria-label="Encerrar sessão"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sair da Conta
                </button>
              )}

              {onDeleteAccount && (
                <button
                  className="btn btn-danger pm-system-btn pm-system-btn--delete"
                  onClick={() => { onClose(); onDeleteAccount(); }}
                  aria-label="Excluir conta permanentemente"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
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