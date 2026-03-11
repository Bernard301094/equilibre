import React, { useState, useRef, useMemo } from "react";
import db from "../../../services/db";
import { formatDateTime } from "../../../utils/dates";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import "./ClinicalNotesTab.css";

export default function ClinicalNotesTab({
  patient,
  session,
  notes,
  onNotesChange,
  onClose,
}) {
  const [activeAction, setActiveAction] = useState({ type: null, id: null });
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, noteId: null });
  const inflightRef = useRef(false);

  // Organizar notas em árvore infinita usando useMemo
  const threadedNotes = useMemo(() => {
    const map = {};
    const roots = [];

    notes.forEach(note => {
      map[note.id] = { ...note, children: [] };
    });

    notes.forEach(note => {
      if (note.parent_id && map[note.parent_id]) {
        map[note.parent_id].children.push(map[note.id]);
      } else {
        roots.push(map[note.id]);
      }
    });

    const sortNodes = (nodes) => {
      nodes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  }, [notes]);

  const resetForm = () => {
    setActiveAction({ type: null, id: null });
    setText("");
    setError("");
  };

  const handleSave = async (parentId = null, editId = null) => {
    if (!text.trim() || inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    setError("");

    try {
      if (editId) {
        await db.update("clinical_notes", { id: editId }, { notes: text.trim() }, session.access_token);
        onNotesChange(notes.map(n => n.id === editId ? { ...n, notes: text.trim() } : n));
      } else {
        const obj = {
          id: "cn" + Date.now(),
          patient_id: patient.id,
          therapist_id: session.id,
          notes: text.trim(),
          parent_id: parentId,
          created_at: new Date().toISOString(),
        };
        await db.insert("clinical_notes", obj, session.access_token);
        onNotesChange([...notes, obj]);
      }
      resetForm();
    } catch (e) {
      setError("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  const executeDelete = async () => {
    const id = confirmDelete.noteId;
    try {
      await db.delete("clinical_notes", { id }, session.access_token);
      
      const getIdsToRemove = (parentId, allNotes) => {
        let ids = [parentId];
        const children = allNotes.filter(n => n.parent_id === parentId);
        children.forEach(c => {
          ids = [...ids, ...getIdsToRemove(c.id, allNotes)];
        });
        return ids;
      };
      
      const idsToRemove = getIdsToRemove(id, notes);
      onNotesChange(notes.filter(n => !idsToRemove.includes(n.id)));
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      setConfirmDelete({ isOpen: false, noteId: null });
    }
  };

  const renderNoteForm = (parentId = null, editId = null) => (
    <div className="cn-form">
      <textarea
        className="cn-textarea"
        placeholder={editId ? "A editar anotação..." : "Escreva a sua anotação verde..."}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      {error && <p className="cn-error">{error}</p>}
      <div className="cn-form-actions">
        <button className="btn-organic btn-cancel" onClick={resetForm}>Cancelar</button>
        <button 
          className="btn-organic btn-save" 
          onClick={() => handleSave(parentId, editId)}
          disabled={saving || !text.trim()}
        >
          {saving ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </div>
  );

  // Função de renderização (em vez de componente interno) para evitar re-renders destrutivos
  const renderNoteNode = (note, level = 0) => {
    const isEditing = activeAction.type === 'edit' && activeAction.id === note.id;
    const isReplying = activeAction.type === 'reply' && activeAction.id === note.id;
    const isChild = level > 0;

    return (
      <div key={note.id} className={`cn-node-wrapper ${isChild ? 'cn-child-node' : ''}`}>
        <div className={`cn-card ${isChild ? 'cn-card--child' : ''}`}>
          {isEditing ? (
            renderNoteForm(null, note.id)
          ) : (
            <>
              <div className="cn-card-header">
                <span className="cn-date">🕒 {formatDateTime(note.created_at)}</span>
                <div className="cn-actions">
                  <button onClick={() => { setActiveAction({ type: 'reply', id: note.id }); setText(""); }} title="Responder">💬</button>
                  <button onClick={() => { setActiveAction({ type: 'edit', id: note.id }); setText(note.notes); }} title="Editar">✏️</button>
                  <button onClick={() => setConfirmDelete({ isOpen: true, noteId: note.id })} className="btn-delete-icon" title="Excluir">🗑️</button>
                </div>
              </div>
              <div className="cn-body">{note.notes}</div>
            </>
          )}
        </div>

        {isReplying && (
          <div className="cn-reply-form-wrapper">
            {renderNoteForm(note.id)}
          </div>
        )}

        {/* Chama a função recursivamente */}
        {note.children && note.children.length > 0 && (
          <div className="cn-children-container">
            {note.children.map(child => renderNoteNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="clinical-notes-container">
      <div className="cn-privacy-banner">
        <span className="cn-privacy-icon">🔒</span>
        <p>Anotações privadas. <strong>O paciente não tem acesso.</strong></p>
      </div>

      {activeAction.type !== 'reply' && activeAction.type !== 'edit' && !activeAction.id && (
        <button className="btn-organic btn-new" onClick={() => { setActiveAction({ type: 'new', id: 'root' }); setText(""); }}>
          <span className="cn-plus-icon">+</span> Nova Anotação
        </button>
      )}

      {activeAction.type === 'new' && renderNoteForm()}

      <div className="cn-list">
        {threadedNotes.length === 0 && !activeAction.type && (
          <div className="cn-empty">O jardim está vazio. Comece a anotar.</div>
        )}
        
        {/* Renderiza as notas base usando a função */}
        {threadedNotes.map(rootNote => renderNoteNode(rootNote, 0))}
      </div>

      <div className="cn-footer">
        <button className="btn-organic btn-close" onClick={onClose}>Fechar</button>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Excluir anotação?"
        message="Esta ação apagará esta anotação e todas as suas respostas. Não pode ser desfeita."
        type="danger"
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ isOpen: false, noteId: null })}
      />
    </div>
  );
}