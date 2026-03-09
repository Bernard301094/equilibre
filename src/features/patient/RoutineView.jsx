import { useState, useEffect, useRef, useCallback } from "react";
import db from "../../services/db";
import { BA_PILLARS, BA_DIFFICULTIES, BA_AVOIDANCE_REASONS, LS_LAST_ACTION } from "../../utils/constants";
import { validateActivityForm } from "../../utils/validation";
import EmptyState from "../../components/ui/EmptyState";
import "./RoutineView.css";

const EXEC_SLIDERS = [
  { id: "mood_before",  label: "Humor ANTES",   key: "mood_before",  emoji: "😐" },
  { id: "mood_after",   label: "Humor DEPOIS",  key: "mood_after",   emoji: "😊" },
  { id: "energy_after", label: "Energia Final", key: "energy_after", emoji: "⚡" },
];

/* ── Mapeamento centralizado de categorias ───────────────────────────────────
   Uma única fonte de verdade para cores, badges e acentos de card.
   Adicionar uma categoria nova aqui é suficiente — o CSS usa os mesmos slugs. */
const CATEGORY_MAP = {
  Autocuidado:       { slug: "autocuidado",       badge: "cat-Autocuidado"       },
  Responsabilidades: { slug: "responsabilidades",  badge: "cat-Responsabilidades" },
  Lazer:             { slug: "lazer",              badge: "cat-Lazer"             },
  Movimento:         { slug: "movimento",          badge: "cat-Movimento"         },
  Socialização:      { slug: "socializacao",       badge: "cat-Socializacao"      },
};

/** Retorna as classes CSS de acento e badge para uma categoria. */
function getCatClasses(category) {
  const entry = CATEGORY_MAP[category];
  if (!entry) return { accent: "", badge: "cat-Outro" };
  return {
    accent: `activity-cat--${entry.slug}`,   // acento lateral do card
    badge:  entry.badge,                      // cor do badge pill
  };
}

/* ── Section header com linha decorativa ───────────────────── */
function SectionHeader({ children }) {
  return (
    <div className="routine-view__section-header">
      <h3 className="routine-view__section-title">{children}</h3>
      <span className="routine-view__section-line" aria-hidden="true" />
    </div>
  );
}

export default function PatientRoutine({ session }) {
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [successMsg, setSuccessMsg] = useState("");
  const [showAdd,    setShowAdd]    = useState(false);
  const [executing,  setExecuting]  = useState(null);
  const [editingId,  setEditingId]  = useState(null);
  const [dialog,     setDialog]     = useState(null);
  const inflightRef = useRef(false);

  const [form, setForm] = useState({
    title: "", category: "Autocuidado", difficulty: "Fácil", date: "", time: "",
  });
  const [formError, setFormError] = useState("");

  const [execForm, setExecForm] = useState({
    did_it: true, mood_before: 5, mood_after: 5, energy_after: 5,
    avoidance_reason: BA_AVOIDANCE_REASONS[0],
  });

  const flash = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3200);
  };

  const fetchActivities = useCallback(async () => {
    try {
      const res = await db.query(
        "activities",
        { filter: { patient_id: session.id }, order: "planned_date.asc" },
        session.access_token
      );
      setActivities(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("[RoutineView]", e);
    } finally {
      setLoading(false);
    }
  }, [session.id, session.access_token]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const openAdd = (category) => {
    setForm({ title: "", category, difficulty: "Fácil", date: "", time: "" });
    setEditingId(null);
    setFormError("");
    setShowAdd(true);
  };

  const openEdit = (act) => {
    const d    = new Date(act.planned_date);
    const date = d.toISOString().split("T")[0];
    const time = d.toTimeString().substring(0, 5);
    setForm({ title: act.title, category: act.category, difficulty: act.difficulty, date, time });
    setEditingId(act.id);
    setFormError("");
    setShowAdd(true);
  };

  const closeAdd = () => { setShowAdd(false); setEditingId(null); };

  const handleSave = async () => {
    const err = validateActivityForm(form);
    if (err) { setFormError(err); return; }
    if (inflightRef.current) return;
    inflightRef.current = true;
    setFormError("");
    try {
      const planned_date = new Date(`${form.date}T${form.time}`).toISOString();
      const payload = { title: form.title, category: form.category, difficulty: form.difficulty, planned_date };
      if (editingId) {
        await db.update("activities", { id: editingId }, payload, session.access_token);
        flash("✏️ Alterações salvas!");
      } else {
        await db.insert("activities", { ...payload, patient_id: session.id, status: "pendente" }, session.access_token);
        flash("✅ Atividade agendada!");
      }
      closeAdd();
      fetchActivities();
    } catch (e) {
      setFormError("Erro ao salvar: " + e.message);
    } finally {
      inflightRef.current = false;
    }
  };

  const handleDelete = (id) => {
    setDialog({
      message: "Tem certeza que deseja excluir esta atividade?",
      onConfirm: async () => {
        setDialog(null);
        const prev = [...activities];
        setActivities((a) => a.filter((x) => x.id !== id));
        try {
          await db.delete("activities", { id }, session.access_token);
          flash("🗑️ Atividade excluída!");
        } catch (e) {
          setActivities(prev);
          setDialog({ message: "Erro ao excluir: " + e.message, onConfirm: () => setDialog(null) });
        }
      },
    });
  };

  const handleExecute = async () => {
    if (!executing || inflightRef.current) return;
    inflightRef.current = true;
    try {
      const update = execForm.did_it
        ? { status: "concluido",       mood_before: execForm.mood_before, mood_after: execForm.mood_after, energy_after: execForm.energy_after }
        : { status: "nao_realizado",   avoidance_reason: execForm.avoidance_reason };
      await db.update("activities", { id: executing.id }, update, session.access_token);
      setExecuting(null);
      flash("🌟 Registro salvo!");
      localStorage.setItem(LS_LAST_ACTION, String(Date.now()));
      fetchActivities();
    } catch (e) {
      alert("Erro ao registrar: " + e.message);
    } finally {
      inflightRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="routine-view__loading" aria-live="polite">
        <span style={{ fontSize: "2rem" }} aria-hidden="true">🗓️</span>
        <p>Carregando a rotina…</p>
      </div>
    );
  }

  const pending = activities.filter((a) => a.status === "pendente");
  const past    = activities.filter((a) => a.status !== "pendente").slice().reverse();

  return (
    <div className="routine-view page-fade-in">

      {/* ── Header ── */}
      <header className="routine-view__header">
        <h2 className="routine-view__title">🗓️ Minha Rotina</h2>
        <p className="routine-view__subtitle">
          Planeje pequenas ações nos seus 5 pilares. A ação traz a motivação!
        </p>
      </header>

      {/* ── Flash ── */}
      {successMsg && (
        <div className="routine-view__success" role="status" aria-live="polite">
          {successMsg}
        </div>
      )}

      {/* ── Pilares ── */}
      <div className="routine-view__pillars" role="list" aria-label="Pilares de ativação comportamental">
        {BA_PILLARS.map((p) => (
          <div
            key={p.name}
            role="listitem"
            tabIndex={0}
            onClick={() => openAdd(p.name)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openAdd(p.name)}
            className={`routine-view__pillar-card pillar-cat--${p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
            aria-label={`Adicionar atividade de ${p.name}`}
          >
            <div className="routine-view__pillar-icon" aria-hidden="true">{p.icon}</div>
            <div className="routine-view__pillar-name">{p.name}</div>
            <div className="routine-view__pillar-desc">{p.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Pendentes ── */}
      {pending.length === 0 ? (
        <EmptyState
          icon="🗓️"
          message="Nenhuma atividade planejada."
          sub="Clique num pilar acima para agendar uma ação!"
        />
      ) : (
        <section aria-label="Atividades para fazer">
          <SectionHeader>Para Fazer · {pending.length}</SectionHeader>
          <div className="routine-view__activity-list">
            {pending.map((act) => {
              const { accent, badge } = getCatClasses(act.category);
              return (
              <div key={act.id} className={`routine-view__activity-card ${accent}`}>

                {/* Head: badge + ações rápidas */}
                <div className="routine-view__act-head">
                  <span className={`routine-view__cat-badge ${badge}`}>
                    {act.category}
                  </span>
                  <div className="routine-view__act-actions" style={{ marginLeft: "auto" }}>
                    <button
                      className="routine-view__act-btn routine-view__act-btn--delete"
                      onClick={() => handleDelete(act.id)}
                      aria-label={`Excluir ${act.title}`}
                    >🗑️</button>
                    <button
                      className="routine-view__act-btn routine-view__act-btn--edit"
                      onClick={() => openEdit(act)}
                      aria-label={`Editar ${act.title}`}
                    >✏️ Editar</button>
                  </div>
                </div>

                {/* Conteúdo */}
                <h4 className="routine-view__act-title">{act.title}</h4>
                <p className="routine-view__act-meta">
                  <span>⏰ {new Date(act.planned_date).toLocaleString("pt-BR", {
                    weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}</span>
                  <span>· Desafio: <strong>{act.difficulty}</strong></span>
                </p>

                {/* CTA principal */}
                <button
                  className="routine-view__act-btn routine-view__act-btn--exec"
                  style={{ marginTop: "4px" }}
                  onClick={() => {
                    setExecForm({ did_it: true, mood_before: 5, mood_after: 5, energy_after: 5, avoidance_reason: BA_AVOIDANCE_REASONS[0] });
                    setExecuting(act);
                  }}
                  aria-label={`Registrar execução de ${act.title}`}
                >
                  ✓ Registrar esta atividade
                </button>

              </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Histórico ── */}
      {past.length > 0 && (
        <section aria-label="Histórico de atividades">
          <SectionHeader>Histórico · {past.length}</SectionHeader>
          <div className="routine-view__history-list">
            {past.map((act) => {
              const { accent, badge } = getCatClasses(act.category);
              return (
              <div
                key={act.id}
                className={[
                  "routine-view__hist-card",
                  `routine-view__hist-card--${act.status}`,
                  accent,
                ].filter(Boolean).join(" ")}
              >
                <div className="routine-view__hist-header">
                  <div className="routine-view__hist-badges">
                    <span className={`routine-view__cat-badge ${badge}`}>
                      {act.category}
                    </span>
                    <span className={`routine-view__hist-status routine-view__hist-status--${act.status}`}>
                      {act.status === "concluido" ? "✅ Concluído" : "❌ Não feito"}
                    </span>
                  </div>
                  <button
                    className="routine-view__hist-delete-btn"
                    onClick={() => handleDelete(act.id)}
                    aria-label={`Excluir ${act.title}`}
                  >🗑️</button>
                </div>

                <h4 className={[
                  "routine-view__hist-title",
                  act.status === "nao_realizado" ? "routine-view__hist-title--strike" : "",
                ].filter(Boolean).join(" ")}>
                  {act.title}
                </h4>

                <p className="routine-view__hist-date">
                  {new Date(act.planned_date).toLocaleString("pt-BR", {
                    weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </p>

                {act.status === "concluido" && (
                  <div className="routine-view__hist-metrics">
                    <span>
                      Humor: <strong>{act.mood_before} ➔ {act.mood_after}</strong>{" "}
                      {act.mood_after > act.mood_before ? "📈" : act.mood_after < act.mood_before ? "📉" : "➖"}
                    </span>
                    <span>Energia: <strong>{act.energy_after}/10</strong> ⚡</span>
                  </div>
                )}

                {act.status === "nao_realizado" && act.avoidance_reason && (
                  <p className="routine-view__hist-reason">
                    <strong>Motivo:</strong> {act.avoidance_reason}
                  </p>
                )}
              </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Modal: confirmar exclusão ── */}
      {dialog && (
        <div className="routine-view__overlay" onClick={() => setDialog(null)}>
          <div
            className="routine-view__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true"
          >
            <div className="routine-view__modal-icon" aria-hidden="true">⚠️</div>
            <p className="routine-view__modal-title">Excluir atividade?</p>
            <p className="routine-view__modal-desc">{dialog.message}</p>
            <div className="routine-view__modal-actions">
              <button className="routine-view__modal-btn routine-view__modal-btn--cancel" onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button className="routine-view__modal-btn routine-view__modal-btn--confirm" onClick={dialog.onConfirm}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: adicionar / editar ── */}
      {showAdd && (
        <div className="routine-view__overlay" onClick={closeAdd}>
          <div
            className="routine-view__modal routine-view__modal--form"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="add-act-title"
          >
            <h3 id="add-act-title" className="routine-view__modal-title">
              {editingId ? "✏️ Editar" : "➕ Planejar"}: {form.category}
            </h3>
            <p className="routine-view__modal-desc">
              {editingId
                ? "Ajuste os detalhes da sua ação planejada."
                : `Adicione uma ação para o pilar de ${form.category}.`}
            </p>

            <div className="routine-view__field">
              <label htmlFor="act-title" className="routine-view__field-label">O que você vai fazer?</label>
              <input
                id="act-title"
                className="routine-view__field-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Tomar um chá na varanda"
              />
            </div>

            <div className="routine-view__field">
              <label htmlFor="act-difficulty" className="routine-view__field-label">Nível de desafio</label>
              <select
                id="act-difficulty"
                className="routine-view__field-input routine-view__field-select"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                {BA_DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="routine-view__date-grid">
              <div className="routine-view__field">
                <label htmlFor="act-date" className="routine-view__field-label">Qual dia?</label>
                <input id="act-date" type="date" className="routine-view__field-input"
                  value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="routine-view__field">
                <label htmlFor="act-time" className="routine-view__field-label">Que horas?</label>
                <input id="act-time" type="time" className="routine-view__field-input"
                  value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>

            {formError && <p className="routine-view__error" role="alert">{formError}</p>}

            <div className="routine-view__modal-actions">
              <button className="routine-view__modal-btn routine-view__modal-btn--cancel" onClick={closeAdd}>
                Cancelar
              </button>
              <button className="routine-view__modal-btn routine-view__modal-btn--save" onClick={handleSave}>
                {editingId ? "Salvar Alterações" : "Agendar Ação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: registrar execução ── */}
      {executing && (
        <div className="routine-view__overlay" onClick={() => setExecuting(null)}>
          <div
            className="routine-view__modal routine-view__modal--form"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="exec-act-title"
          >
            <h3 id="exec-act-title" className="routine-view__modal-title">
              Avaliar Atividade
            </h3>
            <p className="routine-view__modal-desc">
              <strong>{executing.title}</strong>
            </p>

            <div className="routine-view__field">
              <span className="routine-view__field-label">Você conseguiu realizar esta atividade?</span>
              <div className="routine-view__did-it-row">
                <button
                  className={`routine-view__did-it-btn ${execForm.did_it ? "routine-view__did-it-btn--yes" : "routine-view__did-it-btn--outline"}`}
                  onClick={() => setExecForm({ ...execForm, did_it: true })}
                >
                  ✓ Sim, eu fiz!
                </button>
                <button
                  className={`routine-view__did-it-btn ${!execForm.did_it ? "routine-view__did-it-btn--no" : "routine-view__did-it-btn--outline"}`}
                  onClick={() => setExecForm({ ...execForm, did_it: false })}
                >
                  ✗ Não consegui
                </button>
              </div>
            </div>

            {execForm.did_it ? (
              <div className="routine-view__exec-sliders page-fade-in">
                {EXEC_SLIDERS.map(({ id, label, key, emoji }) => (
                  <div key={id} className="routine-view__field">
                    <label htmlFor={id} className="routine-view__field-label">
                      {emoji} {label} (0–10)
                    </label>
                    <input
                      id={id} type="range" min="0" max="10"
                      value={execForm[key]}
                      onChange={(e) => setExecForm({ ...execForm, [key]: Number(e.target.value) })}
                      className="routine-view__exec-range"
                      aria-valuenow={execForm[key]}
                    />
                    <div className="routine-view__exec-range-val" aria-live="polite">
                      {execForm[key]}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="routine-view__field page-fade-in">
                <label htmlFor="avoidance-reason" className="routine-view__field-label">
                  Principal motivo
                </label>
                <select
                  id="avoidance-reason"
                  className="routine-view__field-input routine-view__field-select"
                  value={execForm.avoidance_reason}
                  onChange={(e) => setExecForm({ ...execForm, avoidance_reason: e.target.value })}
                >
                  {BA_AVOIDANCE_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div className="routine-view__modal-actions">
              <button className="routine-view__modal-btn routine-view__modal-btn--cancel" onClick={() => setExecuting(null)}>
                Cancelar
              </button>
              <button className="routine-view__modal-btn routine-view__modal-btn--save" onClick={handleExecute}>
                💾 Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}