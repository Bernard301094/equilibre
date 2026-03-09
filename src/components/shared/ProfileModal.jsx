import { useRef, useState } from "react";
import Modal from "../ui/Modal";
import db from "../../services/db";
import storage from "../../services/storage";
import AvatarDisplay from "./AvatarDisplay";
import "./ProfileModal.css";

/**
 * Modal to view and change the user's profile photo.
 * On mobile, also exposes system actions (theme, logout, delete account)
 * since the Sidebar that normally holds them is hidden.
 *
 * Props:
 * session           — current session object
 * setSession        — session updater from useSession
 * onClose
 * theme             — 'light' | 'dark'  (optional, passed on mobile)
 * toggleTheme       — () => void         (optional, passed on mobile)
 * onLogout          — () => void         (optional, passed on mobile)
 * onDeleteAccount   — () => void         (optional, passed on mobile)
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
      <div className="profile-modal-content">
        <h3 id={labelId} className="profile-modal-title">
          Foto de Perfil
        </h3>

        <AvatarDisplay
          name={session.name}
          avatarUrl={session.avatar_url}
          size={100}
          onClick={() => fileInputRef.current?.click()}
          title="Carregar nova foto"
          className="profile-modal-avatar"
        />

        {error && (
          <p className="profile-modal-error" role="alert">
            {error}
          </p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="profile-modal-input-hidden"
          id="avatar-file-input"
          onChange={handleFileChange}
          aria-label="Selecionar foto de perfil"
        />

        <button
          className="profile-modal-btn profile-modal-btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? "A carregar..." : "Carregar Nova Foto"}
        </button>

        <button
          className="profile-modal-btn profile-modal-btn-outline"
          onClick={onClose}
        >
          Fechar
        </button>

        {/* ── Ações de sistema — só renderizadas no mobile ── */}
        {hasSystemActions && (
          <>
            <div className="profile-modal-divider" />

            <div className="profile-modal-actions">
              {/* Alternar tema */}
              {toggleTheme && (
                <button
                  className="profile-modal-btn profile-modal-btn-outline profile-modal-btn-icon"
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
                  className="profile-modal-btn profile-modal-btn-outline profile-modal-btn-icon"
                  onClick={() => { onClose(); onLogout(); }}
                  aria-label="Encerrar sessão"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
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
                  className="profile-modal-btn profile-modal-btn-danger profile-modal-btn-icon"
                  onClick={() => { onClose(); onDeleteAccount(); }}
                  aria-label="Excluir conta permanentemente"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
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