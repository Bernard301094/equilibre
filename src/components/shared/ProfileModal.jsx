import { useRef, useState } from "react";
import Modal from "../ui/Modal";
import db from "../../services/db";
import storage from "../../services/storage";
import AvatarDisplay from "./AvatarDisplay";

/**
 * Modal to view and change the user's profile photo.
 *
 * Props:
 *   session      — current session object
 *   setSession   — session updater from useSession
 *   onClose
 */
export default function ProfileModal({ session, setSession, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const labelId = "profile-modal-title";

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
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={320} labelId={labelId}>
      <div style={{ textAlign: "center", padding: "28px 24px 20px" }}>
        <h3 id={labelId} style={{ marginBottom: 20, fontSize: 17 }}>
          Foto de Perfil
        </h3>

        <AvatarDisplay
          name={session.name}
          avatarUrl={session.avatar_url}
          size={100}
          className="avatar"
        />

        {error && (
          <p
            style={{
              color: "#c0444a",
              fontSize: 13,
              margin: "14px 0 0",
            }}
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
          style={{ width: "100%", marginTop: 20, marginBottom: 10 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-busy={uploading}
        >
          {uploading ? "A carregar..." : "Carregar Nova Foto"}
        </button>

        <button
          className="btn btn-outline"
          style={{ width: "100%" }}
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}