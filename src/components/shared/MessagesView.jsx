/**
 * MessagesView.jsx — Mural de Orientações Clínicas
 *
 * Renderiza de forma diferenciada conforme o role:
 *   - THERAPIST → Lista de pacientes à esquerda + FeedbackTab à direita
 *   - PATIENT   → TherapistFeedback em tela cheia
 *
 * Design intencional: canal assíncrono e clínico, NÃO um chat informal.
 */
import { useState, useEffect } from "react";
import db from "../../services/db";
import { ROLE } from "../../utils/constants";
import AvatarDisplay from "../shared/AvatarDisplay";
import FeedbackTab from "../../features/therapist/PatientModal/FeedbackTab";
import TherapistFeedback from "../../features/patient/TherapistFeedback";
import "./MessagesView.css";

/* ── Therapist side ─────────────────────────────────────── */
function TherapistMessagesView({ session }) {
  const [patients,  setPatients]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading,   setLoading]   = useState(true);

  /* Carrega lista de pacientes vinculados ao terapeuta */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await db.query(
          "users",
          { filter: { therapist_id: session.id, role: ROLE.PATIENT } },
          session.access_token
        );
        if (!active) return;
        const list = Array.isArray(rows) ? rows : [];
        setPatients(list);
        if (list.length > 0) setSelected(list[0]);
      } catch (e) {
        console.error("[MessagesView] Erro ao carregar pacientes:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  /* Carrega feedbacks do paciente selecionado */
  useEffect(() => {
    if (!selected) return;
    let active = true;
    (async () => {
      try {
        const rows = await db.query(
          "therapist_feedback",
          {
            filter: { patient_id: selected.id, therapist_id: session.id },
            order: "created_at.desc",
          },
          session.access_token
        );
        if (!active) return;
        setFeedbacks(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.error("[MessagesView] Erro ao carregar orientações:", e);
        setFeedbacks([]);
      }
    })();
    return () => { active = false; };
  }, [selected?.id, session.id, session.access_token]);

  if (loading) {
    return (
      <div className="mv-loading" aria-live="polite">
        <span className="mv-loading__spinner" aria-hidden="true" />
        Carregando pacientes…
      </div>
    );
  }

  return (
    <div className="mv-therapist">

      {/* ── Cabeçalho da página ── */}
      <header className="mv-page-header">
        <div className="mv-page-header__icon" aria-hidden="true">📬</div>
        <div>
          <h2 className="mv-page-header__title">Mural de Orientações</h2>
          <p className="mv-page-header__sub">
            Envie orientações clínicas aos seus pacientes. Este é um canal assíncrono — cada mensagem deve ser cuidadosamente elaborada.
          </p>
        </div>
      </header>

      <div className="mv-therapist__layout">

        {/* ── Lista de pacientes (coluna esquerda) ── */}
        <aside className="mv-patient-list" aria-label="Lista de pacientes">
          <div className="mv-patient-list__header">
            <span className="mv-patient-list__title">Pacientes</span>
            <span className="mv-patient-list__count">{patients.length}</span>
          </div>

          {patients.length === 0 ? (
            <div className="mv-patient-list__empty">
              <span aria-hidden="true">👥</span>
              <p>Nenhum paciente vinculado ainda.</p>
            </div>
          ) : (
            <ul className="mv-patient-list__ul" role="listbox" aria-label="Selecionar paciente">
              {patients.map((p) => (
                <li key={p.id} role="none">
                  <button
                    role="option"
                    aria-selected={selected?.id === p.id}
                    className={[
                      "mv-patient-item",
                      selected?.id === p.id ? "mv-patient-item--active" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelected(p)}
                  >
                    <AvatarDisplay
                      name={p.name}
                      avatarUrl={p.avatar_url}
                      size={36}
                      className="mv-patient-item__avatar"
                    />
                    <div className="mv-patient-item__info">
                      <span className="mv-patient-item__name">
                        {p.name.split(" ").slice(0, 2).join(" ")}
                      </span>
                      <span className="mv-patient-item__email">{p.email}</span>
                    </div>
                    {selected?.id === p.id && (
                      <span className="mv-patient-item__dot" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Área de orientações (coluna direita) ── */}
        <main className="mv-feedback-area" aria-label="Orientações do paciente selecionado">
          {!selected ? (
            <div className="mv-feedback-area__empty">
              <span aria-hidden="true">👈</span>
              <p>Selecione um paciente para ver e enviar orientações.</p>
            </div>
          ) : (
            <>
              {/* Sub-header do paciente selecionado */}
              <div className="mv-feedback-area__header">
                <AvatarDisplay
                  name={selected.name}
                  avatarUrl={selected.avatar_url}
                  size={40}
                />
                <div>
                  <p className="mv-feedback-area__patient-name">{selected.name}</p>
                  <p className="mv-feedback-area__patient-label">
                    Orientações clínicas — visíveis apenas por este paciente
                  </p>
                </div>
              </div>

              <div className="mv-feedback-area__body">
                <FeedbackTab
                  patient={selected}
                  session={session}
                  feedbacks={feedbacks}
                  onFeedbacksChange={setFeedbacks}
                />
              </div>
            </>
          )}
        </main>

      </div>
    </div>
  );
}

/* ── Patient side ───────────────────────────────────────── */
function PatientMessagesView({ session, setView }) {
  return (
    <div className="mv-patient">
      <header className="mv-page-header">
        <div className="mv-page-header__icon" aria-hidden="true">📬</div>
        <div>
          <h2 className="mv-page-header__title">Mural de Orientações</h2>
          <p className="mv-page-header__sub">
            Mensagens e orientações enviadas pela sua profissional de saúde.
          </p>
        </div>
      </header>

      <TherapistFeedback session={session} setView={setView} />
    </div>
  );
}

/* ── Entry point ────────────────────────────────────────── */
export default function MessagesView({ session, setView }) {
  if (session.role === ROLE.THERAPIST) {
    return <TherapistMessagesView session={session} />;
  }
  return <PatientMessagesView session={session} setView={setView} />;
}