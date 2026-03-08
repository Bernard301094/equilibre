import { useState, useEffect, useRef, useCallback } from "react";
import db from "../../services/db";
import { BA_PILLARS, BA_DIFFICULTIES, BA_AVOIDANCE_REASONS, LS_LAST_ACTION } from "../../utils/constants";
import { validateActivityForm } from "../../utils/validation";
import EmptyState from "../../components/ui/EmptyState";

export default function PatientRoutine({ session }) {
  const [activities,  setActivities]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [successMsg,  setSuccessMsg]  = useState("");
  const [showAdd,     setShowAdd]     = useState(false);
  const [executing,   setExecuting]   = useState(null);
  const [editingId,   setEditingId]   = useState(null);
  const [dialog,      setDialog]      = useState(null);
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
    setTimeout(() => setSuccessMsg(""), 3000);
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
      setShowAdd(false);
      setEditingId(null);
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
        ? { status: "concluido",     mood_before: execForm.mood_before, mood_after: execForm.mood_after, energy_after: execForm.energy_after }
        : { status: "nao_realizado", avoidance_reason: execForm.avoidance_reason };
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

  if (loading) return <p className="rv-loading">Carregando a rotina...</p>;

  const pending = activities.filter((a) => a.status === "pendente");
  const past    = activities.filter((a) => a.status !== "pendente").slice().reverse();

  return (
    <div className="rv-wrapper page-fade-in">
      <div className="page-header">
        <h2>Minha Rotina (Ativação)</h2>
        <p>Planeje pequenas ações nos seus 5 pilares. A ação traz a motivação!</p>
      </div>

      {successMsg && (
        <div className="success-banner rv-success" role="status">{successMsg}</div>
      )}

      {/* ── Pillar cards ── */}
      <div className="pillars-container" role="list" aria-label="Pilares de ativação">
        {BA_PILLARS.map((p) => (
          <div
            key={p.name}
            role="listitem button"
            tabIndex={0}
            onClick={() => openAdd(p.name)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openAdd(p.name)}
            className={`pillar-card cat-${p.name}`}
            aria-label={`Adicionar atividade de ${p.name}`}
          >
            <div className="rv-pillar-icon" aria-hidden="true">{p.icon}</div>
            <div className="rv-pillar-name">{p.name}</div>
            <div className="rv-pillar-desc">{p.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Pending activities ── */}
      {pending.length === 0 ? (
        <EmptyState
          icon="🗓️"
          message="Nenhuma atividade planejada."
          sub="Clique num pilar acima para agendar uma ação!"
        />
      ) : (
        <section aria-label="Atividades para fazer">
          <h3 className="rv-section-title">Para Fazer</h3>
          {pending.map((act) => (
            <div key={act.id} className="activity-card">
              <span className={`cat-badge cat-${act.category}`}>{act.category}</span>
              <h4 className="rv-act-title">{act.title}</h4>
              <div className="rv-act-meta">
                ⏰ {new Date(act.planned_date).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })} | Desafio: {act.difficulty}
              </div>
              <div className="rv-act-actions">
                <button
                  aria-label={`Excluir ${act.title}`}
                  className="btn btn-sm rv-act-btn-delete"
                  onClick={() => handleDelete(act.id)}
                >
                  🗑️
                </button>
                <button
                  aria-label={`Editar ${act.title}`}
                  className="btn btn-sm rv-act-btn-edit"
                  onClick={() => openEdit(act)}
                >
                  ✏️ Editar
                </button>
                <button
                  aria-label={`Registrar execução de ${act.title}`}
                  className="btn btn-sm rv-act-btn-exec"
                  onClick={() => {
                    setExecForm({ did_it: true, mood_before: 5, mood_after: 5, energy_after: 5, avoidance_reason: BA_AVOIDANCE_REASONS[0] });
                    setExecuting(act);
                  }}
                >
                  Fiz isso! ✓
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── History ── */}
      {past.length > 0 && (
        <section className="rv-history" aria-label="Histórico de atividades">
          <h3 className="rv-section-title">Histórico</h3>
          <div className="rv-history-list">
            {past.map((act) => (
              <div
                key={act.id}
                className={`activity-card done rv-hist-card rv-hist-card--${act.status}`}
              >
                <div className="rv-hist-header">
                  <div className="rv-hist-badges">
                    <span className={`cat-badge cat-${act.category}`}>{act.category}</span>
                    <span className={`rv-hist-status rv-hist-status--${act.status}`}>
                      {act.status === "concluido" ? "✅ Concluído" : "❌ Não feito"}
                    </span>
                  </div>
                  <button
                    aria-label={`Excluir ${act.title}`}
                    onClick={() => handleDelete(act.id)}
                    className="rv-hist-delete-btn"
                  >
                    🗑️
                  </button>
                </div>
                <h4 className={`rv-hist-title${act.status === "nao_realizado" ? " rv-hist-title--strike" : ""}`}>
                  {act.title}
                </h4>
                <div className="rv-hist-date">
                  {new Date(act.planned_date).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                {act.status === "concluido" && (
                  <div className="rv-hist-metrics">
                    <div>
                      Humor: <strong>{act.mood_before} ➔ {act.mood_after}</strong>{" "}
                      {act.mood_after > act.mood_before ? "📈" : act.mood_after < act.mood_before ? "📉" : "➖"}
                    </div>
                    <div>Energia: <strong>{act.energy_after}/10</strong> ⚡</div>
                  </div>
                )}
                {act.status === "nao_realizado" && (
                  <div className="rv-hist-skip-reason">
                    <strong>Motivo:</strong> {act.avoidance_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Modal: confirm / alert ── */}
      {dialog && (
        <div className="overlay" onClick={() => setDialog(null)}>
          <div
            className="modal rv-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="rv-dialog-icon" aria-hidden="true">⚠️</div>
            <p className="rv-dialog-desc">{dialog.message}</p>
            <div className="logout-dialog-actions">
              <button className="btn btn-outline rv-dialog-btn" onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button className="btn-danger rv-dialog-btn" onClick={dialog.onConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: add / edit activity ── */}
      {showAdd && (
        <div className="overlay" onClick={() => { setShowAdd(false); setEditingId(null); }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-act-title"
          >
            <h3 id="add-act-title">
              {editingId ? "Editar" : "Planejar"}: {form.category}
            </h3>
            <p className="rv-modal-desc">
              {editingId
                ? "Ajustando sua ação planejada."
                : `Adicionando uma ação para o pilar de ${form.category}.`}
            </p>

            <div className="field">
              <label htmlFor="act-title">O que você vai fazer?</label>
              <input
                id="act-title"
                className="rv-field-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Tomar um chá na varanda"
              />
            </div>
            <div className="field">
              <label htmlFor="act-difficulty">Nível de desafio</label>
              <select
                id="act-difficulty"
                className="rv-field-input rv-field-select"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                {BA_DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="rv-date-grid">
              <div className="field">
                <label htmlFor="act-date">Qual dia?</label>
                <input
                  id="act-date"
                  type="date"
                  className="rv-field-input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="act-time">Que horas?</label>
                <input
                  id="act-time"
                  type="time"
                  className="rv-field-input"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            {formError && <p className="error-msg" role="alert">{formError}</p>}

            <div className="rv-modal-actions">
              <button className="btn btn-outline" onClick={() => { setShowAdd(false); setEditingId(null); }}>
                Cancelar
              </button>
              <button className="btn btn-sage" onClick={handleSave}>
                {editingId ? "Salvar Alterações" : "Agendar Ação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: execute activity ── */}
      {executing && (
        <div className="overlay" onClick={() => setExecuting(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exec-act-title"
          >
            <h3 id="exec-act-title" className="rv-exec-title">Avaliar Atividade</h3>
            <p className="rv-modal-desc">
              <strong>{executing.title}</strong>
            </p>

            <div className="field rv-exec-did-it">
              <label className="rv-exec-did-it-label">
                Você conseguiu realizar esta atividade?
              </label>
              <div className="rv-exec-did-it-row">
                <button
                  className={`btn rv-exec-did-it-btn${execForm.did_it ? " btn-sage" : " btn-outline"}`}
                  onClick={() => setExecForm({ ...execForm, did_it: true })}
                >
                  Sim, eu fiz!
                </button>
                <button
                  className={`btn rv-exec-did-it-btn${!execForm.did_it ? " btn-accent" : " btn-outline"}`}
                  onClick={() => setExecForm({ ...execForm, did_it: false })}
                >
                  Não consegui
                </button>
              </div>
            </div>

            {execForm.did_it ? (
              <div className="page-fade-in">
                {[
                  { id: "mood_before",  label: "Humor ANTES (0–10)",   val: execForm.mood_before,  key: "mood_before"  },
                  { id: "mood_after",   label: "Humor DEPOIS (0–10)",  val: execForm.mood_after,   key: "mood_after"   },
                  { id: "energy_after", label: "Energia final (0–10)", val: execForm.energy_after, key: "energy_after" },
                ].map(({ id, label, val, key }) => (
                  <div className="field" key={id}>
                    <label htmlFor={id}>{label}</label>
                    <input
                      id={id}
                      type="range"
                      min="0"
                      max="10"
                      value={val}
                      onChange={(e) => setExecForm({ ...execForm, [key]: Number(e.target.value) })}
                      className="rv-exec-range"
                      aria-valuenow={val}
                    />
                    <div className="rv-exec-range-val">{val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="field page-fade-in">
                <label htmlFor="avoidance-reason">Principal motivo</label>
                <select
                  id="avoidance-reason"
                  className="rv-field-input rv-field-select"
                  value={execForm.avoidance_reason}
                  onChange={(e) => setExecForm({ ...execForm, avoidance_reason: e.target.value })}
                >
                  {BA_AVOIDANCE_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div className="rv-modal-actions">
              <button className="btn btn-outline" onClick={() => setExecuting(null)}>
                Cancelar
              </button>
              <button className="btn btn-sage" onClick={handleExecute}>
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}