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
      >
        {/* Header */}
        <div className="patient-modal-header">
          <h3 id={labelId} className="patient-title">
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
            className="patient-modal-tabs-bar"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`tabpanel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`patient-modal-tab-btn${tab === t.id ? " active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="patient-modal-body">
          {loading ? (
            <p className="patient-modal-loading">
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