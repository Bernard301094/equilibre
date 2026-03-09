import { useRef, useState } from "react";
import Modal from "../ui/Modal";
import db from "../../services/db";
import storage from "../../services/storage";
import AvatarDisplay from "./AvatarDisplay";
import "./ProfileModal.css";

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
    <Modal onClose={onClose} maxWidth={360} labelId={labelId}>
      <div className="pm-body">

        {/* ── Título ── */}
        <h3 id={labelId} className="pm-title">
          Foto de Perfil
        </h3>

        {/* ── Avatar clicável + badge de câmera ── */}
        <div className="pm-avatar-wrap">
          <AvatarDisplay
            name={session.name}
            avatarUrl={session.avatar_url}
            size={96}
            onClick={() => !uploading && fileInputRef.current?.click()}
            title="Clique para trocar a foto"
          />
          {/* Badge de câmera sobre o avatar — único ponto de upload */}
          <button
            className="pm-avatar-badge"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Carregar nova foto de perfil"
            type="button"
          >
            {uploading ? (
              <span className="pm-spinner" aria-hidden="true" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8
                         a2 2 0 0 1 2-2h4l2-3h6l2 3h4
                         a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </button>
        </div>

        {/* ── Nome do usuário ── */}
        <p className="pm-username">{session.name}</p>

        {/* ── Indicador de upload ── */}
        {uploading && (
          <p className="pm-uploading-label" aria-live="polite">
            A carregar nova foto…
          </p>
        )}

        {/* ── Erro ── */}
        {error && (
          <p className="pm-error" role="alert">{error}</p>
        )}

        {/* ── Input file oculto ── */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="pm-file-input"
          id="avatar-file-input"
          onChange={handleFileChange}
          aria-label="Selecionar foto de perfil"
        />

        {/* ── Ação única: Fechar
            FIX: "Carregar Nova Foto" removido — redundante com o badge
            de câmera sobre o avatar, que já é o ponto de upload principal. */}
        <div className="pm-actions">
          <button
            className="pm-btn pm-btn--ghost"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>

        {/* ── Ações do sistema ── */}
        {hasSystemActions && (
          <>
            <div className="pm-divider" aria-hidden="true" />

            <div className="pm-system-actions">

              {toggleTheme && (
                <button
                  className="pm-btn pm-btn--system"
                  onClick={toggleTheme}
                  type="button"
                  aria-label={
                    theme === "dark"
                      ? "Mudar para modo claro"
                      : "Mudar para modo escuro"
                  }
                >
                  <span aria-hidden="true">
                    {theme === "dark" ? "☀️" : "🌙"}
                  </span>
                  {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                </button>
              )}

              {onLogout && (
                <button
                  className="pm-btn pm-btn--system"
                  onClick={() => { onClose(); onLogout(); }}
                  type="button"
                  aria-label="Encerrar sessão"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sair da Conta
                </button>
              )}

              {onDeleteAccount && (
                <button
                  className="pm-btn pm-btn--danger"
                  onClick={() => { onClose(); onDeleteAccount(); }}
                  type="button"
                  aria-label="Excluir conta permanentemente"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7
                             a2 2 0 0 1-2-2V6m3 0V4
                             a2 2 0 0 1 2-2h4
                             a2 2 0 0 1 2 2v2"/>
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