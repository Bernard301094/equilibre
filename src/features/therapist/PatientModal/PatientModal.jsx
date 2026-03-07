import { useState, useEffect } from "react";
import db from "../../../services/db";
import AvatarDisplay from "../../../components/shared/AvatarDisplay";
import AssignTab from "./AssignTab";
import RoutineTab from "./RoutineTab";
import ClinicalNotesTab from "./ClinicalNotesTab";
import WellbeingTab from "./WellbeingTab";

const TABS = [
  { id: "assign",    label: "📋 Exercícios"  },
  { id: "routine",   label: "🗓️ Rotina (BA)" },
  { id: "wellbeing", label: "🌱 Bem-estar"   },
  { id: "notes",     label: "🔒 Prontuário"  },
];

export default function PatientModal({ patient, session, onClose }) {
  const [tab,     setTab]     = useState("assign");
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState(null);
  const labelId = "patient-modal-title";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ex, assign, goals, notes, acts, diary] = await Promise.all([
          db.query("exercises", {}, session.access_token),
          db.query("assignments",   { filter: { patient_id: patient.id } }, session.access_token),
          db.query("goals",         { filter: { patient_id: patient.id } }, session.access_token),
          db.query("clinical_notes",{
            filter: { patient_id: patient.id, therapist_id: session.id },
            order: "created_at.desc",
          }, session.access_token).catch(() => []),
          db.query("activities", { filter: { patient_id: patient.id }, order: "planned_date.desc" }, session.access_token).catch(() => []),
          db.query("diary_entries", {
            filter: { patient_id: patient.id },
            select: "id,date,mood,energy,anxiety,motivation,created_at",
            order: "date.desc",
          }, session.access_token).catch(() => []),
        ]);

        if (!active) return;

        setData({
          exercises:    (Array.isArray(ex)    ? ex    : []).filter(
            (e) => !e.therapist_id || e.therapist_id === session.id
          ),
          assignments:  Array.isArray(assign) ? assign : [],
          goal:         Array.isArray(goals)  && goals.length > 0 ? goals[0] : null,
          notes:        Array.isArray(notes)  ? notes  : [],
          activities:   Array.isArray(acts)   ? acts   : [],
          diaryEntries: Array.isArray(diary)  ? diary  : [],
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
        className="modal patient-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        style={{ maxWidth: 860, width: "95vw", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="patient-modal-header">
          <h3 id={labelId}>
            <AvatarDisplay
              name={patient.name}
              avatarUrl={patient.avatar_url}
              size={32}
              className="p-avatar"
            />
            {patient.name}
          </h3>

          {/* 4 abas sempre visíveis */}
          <div
            role="tablist"
            aria-label="Abas do paciente"
            style={{
              display: "flex",
              flexWrap: "nowrap",
              justifyContent: "space-between",
              gap: 4,
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              background: "var(--cream)",
              border: "1.5px solid var(--warm)",
              borderRadius: 12,
              padding: "4px 6px",
              marginTop: 12,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`tabpanel-${t.id}`}
                onClick={() => setTab(t.id)}
                style={{
                  all: "unset",
                  flex: "1 1 0",
                  minWidth: 0,
                  boxSizing: "border-box",
                  padding: "9px 10px",
                  textAlign: "center",
                  borderRadius: 8,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background .2s, color .2s, box-shadow .2s",
                  background: tab === t.id ? "var(--white)" : "transparent",
                  color: tab === t.id ? "var(--blue-dark)" : "var(--text-muted)",
                  boxShadow: tab === t.id ? "0 2px 8px rgba(23,82,124,0.12)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="patient-modal-body">
          {loading ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              A carregar dados...
            </p>
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

              <div role="tabpanel" id="tabpanel-wellbeing" hidden={tab !== "wellbeing"}>
                {tab === "wellbeing" && (
                  <WellbeingTab
                    diaryEntries={data.diaryEntries}
                    goal={data.goal}
                    assignments={data.assignments}
                  />
                )}
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