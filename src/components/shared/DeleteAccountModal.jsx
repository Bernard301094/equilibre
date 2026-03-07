import { useState } from "react";
import Modal from "../ui/Modal";
import db from "../../services/db";

const KEYWORD = "EXCLUIR";
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

/**
 * Confirmation modal for permanent account deletion.
 *
 * Props:
 *   session    — current session object
 *   onClose
 *   onDeleted  — called after successful deletion; caller handles logout
 */
export default function DeleteAccountModal({ session, onClose, onDeleted }) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const labelId = "delete-account-title";

  const canConfirm = typed === KEYWORD && !loading;

  const handleDelete = async () => {
    if (!canConfirm) return;
    setError("");
    setLoading(true);

    try {
      if (session.role === "patient") {
        // Notify therapist — best-effort
        if (session.therapist_id) {
          try {
            await db.insert(
              "notifications",
              {
                therapist_id: session.therapist_id,
                patient_id: session.id,
                patient_name: session.name,
                exercise_title: "Conta encerrada pelo paciente",
                type: "account_deleted",
                created_at: new Date().toISOString(),
                read: false,
              },
              session.access_token
            );
          } catch (e) {
            console.warn("[DeleteAccountModal] notification failed:", e);
          }
        }

        // Remove the user row — blocks future login without deleting history
        await db.delete("users", { id: session.id }, session.access_token);

      } else {
        // Therapist: clean up all owned records
        const ownedTables = [
          ["invites", "therapist_id"],
          ["notifications", "therapist_id"],
          ["assignments", "therapist_id"],
          ["goals", "therapist_id"],
          ["clinical_notes", "therapist_id"],
        ];

        for (const [table, field] of ownedTables) {
          try {
            const rows = await db.query(
              table,
              { filter: { [field]: session.id }, select: "id" },
              session.access_token
            );
            if (Array.isArray(rows)) {
              for (const row of rows) {
                await db.delete(table, { id: row.id }, session.access_token);
              }
            }
          } catch (e) {
            console.warn(`[DeleteAccountModal] cleanup ${table} failed:`, e);
          }
        }

        // Unlink patients — set therapist_id to null
        try {
          const patients = await db.query(
            "users",
            { filter: { therapist_id: session.id, role: "patient" }, select: "id" },
            session.access_token
          );
          if (Array.isArray(patients)) {
            for (const p of patients) {
              await db.update(
                "users",
                { id: p.id },
                { therapist_id: null },
                session.access_token
              );
            }
          }
        } catch (e) {
          console.warn("[DeleteAccountModal] unlink patients failed:", e);
        }

        // Remove the therapist user row
        await db.delete("users", { id: session.id }, session.access_token);
      }

      // Server-side session invalidation — best-effort
      try {
        await fetch(`${SUPA_URL}/auth/v1/logout`, {
          method: "POST",
          headers: {
            apikey: SUPA_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      } catch (_) {}

      onDeleted();
    } catch (e) {
      console.error("[DeleteAccountModal] error:", e);
      setError(e?.message || "Erro ao excluir conta. Tente novamente.");
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
        aria-labelledby={labelId}
      >
        <div className="delete-icon" aria-hidden="true">⚠️</div>

        <div id={labelId} className="delete-title">
          Excluir conta
        </div>

        <div className="delete-desc">
          Esta ação é <strong>permanente e irreversível</strong>. Todos os seus
          dados serão apagados para sempre.
          {session.role === "patient" && (
            <>
              <br />
              <br />
              📋 O seu histórico de sessões ficará{" "}
              <strong>preservado no perfil da sua profissional</strong>. Para
              criar uma nova conta será necessário um{" "}
              <strong>novo código de convite</strong>.
            </>
          )}
          {session.role === "therapist" && (
            <>
              <br />
              <br />
              ⚠️ Os seus pacientes serão <strong>desvinculados</strong>, mas as
              contas deles serão mantidas.
            </>
          )}
          <br />
          <br />
          Digite <strong>{KEYWORD}</strong> para confirmar:
        </div>

        <label
          htmlFor="delete-keyword-input"
          style={{ display: "block", marginBottom: 8 }}
          className="sr-only"
        >
          Digite {KEYWORD} para confirmar
        </label>
        <input
          id="delete-keyword-input"
          className="delete-confirm-input"
          placeholder={KEYWORD}
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          autoComplete="off"
          autoFocus
        />

        {error && (
          <p
            style={{ color: "#c0444a", fontSize: 13, marginBottom: 14 }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={!canConfirm}
            aria-busy={loading}
          >
            {loading ? "Excluindo..." : "🗑 Excluir minha conta"}
          </button>
        </div>
      </div>
    </div>
  );
}