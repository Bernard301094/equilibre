import { useState, useEffect } from "react";
import db from "../../../services/db";
import Modal from "../../../components/ui/Modal";
import AvatarDisplay from "../../../components/shared/AvatarDisplay";
import AssignTab from "./AssignTab";
import RoutineTab from "./RoutineTab";
import ClinicalNotesTab from "./ClinicalNotesTab";

const TABS = [
  { id: "assign",  label: "📋 Exercícios" },
  { id: "routine", label: "🗓️ Rotina (BA)" },
  { id: "notes",   label: "🔒 Prontuário" },
];

export default function PatientModal({ patient, session, onClose }) {
  const [tab,      setTab]      = useState("assign");
  const [loading,  setLoading]  = useState(true);
  const [data,     setData]     = useState(null);
  const labelId = "patient-modal-title";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ex, assign, goals, notes, acts] = await Promise.all([
          db.query("exercises", {}, session.access_token),
          db.query("assignments", { filter: { patient_id: patient.id } }, session.access_token),
          db.query("goals",       { filter: { patient_id: patient.id } }, session.access_token),
          db.query("clinical_notes", { filter: { patient_id: patient.id, therapist_id: session.id }, order: "created_at.desc" }, session.access_token).catch(() => []),
          db.query("activities",     { filter: { patient_id: patient.id }, order: "planned_date.desc" }, session.access_token).catch(() => []),
        ]);
        if (!active) return;
        setData({
          exercises:     (Array.isArray(ex)     ? ex     : []).filter((e) => !e.therapist_id || e.therapist_id === session.id),
          assignments:   Array.isArray(assign)  ? assign  : [],
          goal:          Array.isArray(goals) && goals.length > 0 ? goals[0] : null,
          notes:         Array.isArray(notes)   ? notes   : [],
          activities:    Array.isArray(acts)    ? acts     : [],
        });
      } catch (e) {
        console.error("[PatientModal]", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [patient.id, session.id, session.access_token]);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", maxWidth: 600, width: "100%" }}
      >
        {/* Header */}
        <div style={{ padding: "24px 30px 0", borderBottom: "1.5px solid var(--warm)", background: "var(--cream)" }}>
          <h3 id={labelId} style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <AvatarDisplay name={patient.name} avatarUrl={patient.avatar_url} size={32} className="p-avatar" />
            {patient.name}
          </h3>
          <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 2 }} role="tablist" aria-label="Abas do paciente">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`tabpanel-${t.id}`}
                onClick={() => setTab(t.id)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: tab === t.id ? "3px solid var(--blue-dark)" : "3px solid transparent",
                  paddingBottom: 10,
                  fontSize: 14,
                  fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? "var(--blue-dark)" : "var(--text-muted)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all .2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 30px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center" }}>A carregar dados...</p>
          ) : (
            <>
              <div role="tabpanel" id="tabpanel-assign" hidden={tab !== "assign"}>
                {tab === "assign" && (
                  <AssignTab
                    patient={patient}
                    session={session}
                    exercises={data.exercises}
                    assignments={data.assignments}
                    goal={data.goal}
                    onClose={onClose}
                    onDataChange={(updated) => setData((d) => ({ ...d, ...updated }))}
                  />
                )}
              </div>
              <div role="tabpanel" id="tabpanel-routine" hidden={tab !== "routine"}>
                {tab === "routine" && <RoutineTab activities={data.activities} />}
              </div>
              <div role="tabpanel" id="tabpanel-notes" hidden={tab !== "notes"}>
                {tab === "notes" && (
                  <ClinicalNotesTab
                    patient={patient}
                    session={session}
                    notes={data.notes}
                    onNotesChange={(notes) => setData((d) => ({ ...d, notes }))}
                    onClose={onClose}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}