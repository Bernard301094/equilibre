import { useState } from "react";
import db from "../../services/db";
import "./DeleteAccountModal.css";

/**
 * Props:
 * session   — current session object
 * onClose   — callback to close the modal
 * onDeleted — callback executed after successful deletion (usually triggers logout)
 */
export default function DeleteAccountModal({ session, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "EXCLUIR") {
      setError("Digite EXCLUIR para confirmar.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Soft delete en la base de datos marcando deleted_at
      await db.update(
        "users",
        { id: session.id },
        { deleted_at: new Date().toISOString() },
        session.access_token
      );
      
      onDeleted?.();
    } catch (err) {
      setError(err.message || "Erro ao excluir conta. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="delete-overlay" onClick={onClose}>
      <div 
        className="delete-modal" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className="delete-icon" aria-hidden="true">⚠️</div>
        <h3 id="delete-modal-title" className="delete-title">Excluir Conta</h3>
        
        <p className="delete-desc">
          Esta ação é <strong>irreversível</strong>. Todos os seus dados serão perdidos. 
          Para confirmar, digite <strong>EXCLUIR</strong> abaixo.
        </p>

        <input
          type="text"
          className="delete-confirm-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          placeholder="Digite EXCLUIR"
          autoComplete="off"
        />

        {error && <p className="delete-error-msg" role="alert">{error}</p>}

        <div className="delete-actions">
          <button 
            className="delete-btn-cancel" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="delete-btn-confirm" 
            onClick={handleDelete} 
            disabled={loading || confirmText !== "EXCLUIR"}
            aria-busy={loading}
          >
            {loading ? "A excluir..." : "Excluir Conta"}
          </button>
        </div>
      </div>
    </div>
  );
}