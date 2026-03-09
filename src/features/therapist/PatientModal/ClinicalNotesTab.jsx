import { useState, useRef } from "react";
import db from "../../../services/db";
import { formatDateTime } from "../../../utils/dates";
import "./ClinicalNotesTab.css";

export default function ClinicalNotesTab({
  patient, session, notes, onNotesChange, onClose,
}) {
  const [isWriting, setIsWriting] = useState(false);
  const [newText,   setNewText]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const inflightRef = useRef(false);

  const cancelWriting = () => {
    setIsWriting(false);
    setNewText("");
    setError("");
  };

  const saveNote = async () => {
    if (!newText.trim() || inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    setError("");
    try {
      const obj = {
        id:           "cn" + Date.now(),
        patient_id:   patient.id,
        therapist_id: session.id,
        notes:        newText.trim(),
        created_at:   new Date().toISOString(),
      };
      await db.insert("clinical_notes", obj, session.access_token);
      onNotesChange([obj, ...notes]);
      setNewText("");
      setIsWriting(false);
    } catch (e) {
      setError("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  return (
    <div className="clinical-notes">

      {/* ── Aviso de privacidad ── */}
      <div className="clinical-notes__privacy-banner" role="note">
        <span className="clinical-notes__privacy-icon" aria-hidden="true">🔒</span>
        <span className="clinical-notes__privacy-text">
          Anotações privadas.{" "}
          <strong>O paciente não tem acesso a este campo.</strong>
        </span>
      </div>

      {/* ── Botón nueva anotación ── */}
      {!isWriting && (
        <button
          className="clinical-notes__new-btn"
          onClick={() => setIsWriting(true)}
        >
          + Nova Anotação
        </button>
      )}

      {/* ── Formulario de nueva anotación ── */}
      {isWriting && (
        <div className="clinical-notes__form">
          <label
            htmlFor="new-note-textarea"
            className="sr-only"
          >
            Nova anotação clínica
          </label>
          <textarea
            id="new-note-textarea"
            className="clinical-notes__textarea"
            placeholder="Ex: O paciente apresentou melhora na ansiedade..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            autoFocus
          />

          {error && (
            <p className="clinical-notes__error" role="alert">{error}</p>
          )}

          <div className="clinical-notes__form-actions">
            <button
              className="clinical-notes__btn clinical-notes__btn--cancel"
              onClick={cancelWriting}
            >
              Cancelar
            </button>
            <button
              className="clinical-notes__btn clinical-notes__btn--save"
              onClick={saveNote}
              disabled={saving || !newText.trim()}
              aria-busy={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {notes.length === 0 && !isWriting && (
        <p className="clinical-notes__empty">
          Nenhuma anotação ainda.
        </p>
      )}

      {/* ── Lista de notas ── */}
      <div className="clinical-notes__list">
        {notes.map((note) => (
          <div key={note.id} className="clinical-notes__note-card">
            <div className="clinical-notes__note-date">
              📅 {formatDateTime(note.created_at)}
            </div>
            <div className="clinical-notes__note-body">
              {note.notes}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="clinical-notes__footer">
        <button
          className="clinical-notes__btn clinical-notes__btn--close"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>

    </div>
  );
}