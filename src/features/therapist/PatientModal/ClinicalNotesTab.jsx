import { useState, useRef } from "react";
import db from "../../../services/db";
import { formatDateTime } from "../../../utils/dates";

export default function ClinicalNotesTab({
  patient, session, notes, onNotesChange, onClose,
}) {
  const [isWriting,  setIsWriting]  = useState(false);
  const [newText,    setNewText]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const inflightRef = useRef(false);

  const saveNote = async () => {
    if (!newText.trim() || inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    setError("");
    try {
      const obj = {
        id:          "cn" + Date.now(),
        patient_id:  patient.id,
        therapist_id: session.id,
        notes:       newText.trim(),
        created_at:  new Date().toISOString(),
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
    <div style={{ animation: "fadeIn .3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff8e6", border: "1.5px solid #ffe0a0", borderRadius: 10, padding: "9px 14px", marginBottom: 18 }}>
        <span aria-hidden="true" style={{ fontSize: 16 }}>🔒</span>
        <span style={{ fontSize: 12, color: "#7a5800" }}>
          Anotações privadas. <strong>O paciente não tem acesso a este campo.</strong>
        </span>
      </div>

      {!isWriting && (
        <button
          className="btn btn-sage btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => setIsWriting(true)}
        >
          + Nova Anotação
        </button>
      )}

      {isWriting && (
        <div className="card" style={{ marginBottom: 20 }}>
          <label htmlFor="new-note-textarea" className="sr-only">Nova anotação clínica</label>
          <textarea
            id="new-note-textarea"
            className="q-textarea"
            placeholder="Ex: O paciente apresentou melhora na ansiedade..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            style={{ minHeight: 120, marginBottom: 12 }}
            autoFocus
          />
          {error && <p className="error-msg" role="alert">{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={() => { setIsWriting(false); setNewText(""); setError(""); }}>
              Cancelar
            </button>
            <button
              className="btn btn-sage"
              onClick={saveNote}
              disabled={saving || !newText.trim()}
              aria-busy={saving}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !isWriting && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", textAlign: "center", paddingTop: 40 }}>
          Nenhuma anotação ainda.
        </p>
      )}

      {notes.map((note) => (
        <div
          key={note.id}
          className="card"
          style={{ marginBottom: 12, padding: "16px 20px", borderLeft: "4px solid var(--sage)" }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
            📅 {formatDateTime(note.created_at)}
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "var(--text)" }}>
            {note.notes}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button className="btn btn-outline" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}