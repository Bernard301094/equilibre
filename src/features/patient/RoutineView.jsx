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
        ? { status: "concluido",      mood_before: execForm.mood_before, mood_after: execForm.mood_after, energy_after: execForm.energy_after }
        : { status: "nao_realizado",  avoidance_reason: execForm.avoidance_reason };

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

  if (loading) return <p style={{ color: "var(--text-muted)", padding: 20 }}>Carregando a rotina...</p>;

  const pending = activities.filter((a) => a.status === "pendente");
  const past    = activities.filter((a) => a.status !== "pendente").slice().reverse();

  const fieldSt = { width: "100%", padding: "10px 12px", border: "1.5px solid var(--warm)", borderRadius: 10, fontFamily: "DM Sans,sans-serif", fontSize: 14, background: "var(--cream)", color: "var(--text)", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ animation: "fadeUp .4s ease", maxWidth: 640 }}>
      <div className="page-header">
        <h2>Minha Rotina (Ativação)</h2>
        <p>Planeje pequenas ações nos seus 5 pilares. A ação traz a motivação!</p>
      </div>

      {successMsg && (
        <div className="success-banner" role="status" style={{ marginBottom: 20 }}>
          {successMsg}
        </div>
      )}

      {/* Pillar cards */}
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
            <div style={{ fontSize: 32, marginBottom: 8 }} aria-hidden="true">{p.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, letterSpacing: ".05em" }}>
              {p.name}
            </div>
            <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.3 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      {/* Pending */}
      {pending.length === 0 ? (
        <EmptyState
          icon="🗓️"
          message="Nenhuma atividade planejada."
          sub="Clique num pilar acima para agendar uma ação!"
        />
      ) : (
        <section aria-label="Atividades para fazer">
          <h3 style={{ fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Para Fazer</h3>
          {pending.map((act) => (
            <div key={act.id} className="activity-card">
              <span className={`cat-badge cat-${act.category}`}>{act.category}</span>
              <h4 style={{ fontSize: 16, color: "var(--blue-dark)", marginTop: 8, marginBottom: 4 }}>{act.title}</h4>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                ⏰ {new Date(act.planned_date).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })} | Desafio: {act.difficulty}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end", borderTop: "1px solid var(--warm)", paddingTop: 12 }}>
                <button aria-label={`Excluir ${act.title}`} className="btn btn-sm" style={{ background: "transparent", color: "var(--danger)", fontSize: 16, padding: "0 8px" }} onClick={() => handleDelete(act.id)}>🗑️</button>
                <button aria-label={`Editar ${act.title}`} className="btn btn-sm" style={{ background: "var(--warm)", color: "var(--blue-dark)" }} onClick={() => openEdit(act)}>✏️ Editar</button>
                <button aria-label={`Registrar execução de ${act.title}`} className="btn btn-sm" style={{ background: "var(--blue-mid)", color: "white" }} onClick={() => { setExecForm({ did_it: true, mood_before: 5, mood_after: 5, energy_after: 5, avoidance_reason: BA_AVOIDANCE_REASONS[0] }); setExecuting(act); }}>Fiz isso! ✓</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* History */}
      {past.length > 0 && (
        <section aria-label="Histórico de atividades" style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Histórico</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {past.map((act) => (
              <div key={act.id} className="activity-card done" style={{ background: "var(--cream)", borderLeft: `4px solid ${act.status === "concluido" ? "#2d7a3a" : "#c0444a"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <span className={`cat-badge cat-${act.category}`} style={{ fontSize: 10 }}>{act.category}</span>
                    <span style={{ fontWeight: "bold", fontSize: 12, color: act.status === "concluido" ? "#2d7a3a" : "#c0444a", marginLeft: 10 }}>
                      {act.status === "concluido" ? "✅ Concluído" : "❌ Não feito"}
                    </span>
                  </div>
                  <button aria-label={`Excluir ${act.title}`} onClick={() => handleDelete(act.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.6 }}>🗑️</button>
                </div>
                <h4 style={{ fontSize: 15, textDecoration: act.status === "nao_realizado" ? "line-through" : "none", color: "var(--text)", marginBottom: 4 }}>{act.title}</h4>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  {new Date(act.planned_date).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                {act.status === "concluido" && (
                  <div style={{ background: "var(--white)", padding: "8px 12px", borderRadius: 8, fontSize: 13, display: "flex", gap: 16 }}>
                    <div>Humor: <strong>{act.mood_before} ➔ {act.mood_after}</strong> {act.mood_after > act.mood_before ? "📈" : act.mood_after < act.mood_before ? "📉" : "➖"}</div>
                    <div>Energia: <strong>{act.energy_after}/10</strong> ⚡</div>
                  </div>
                )}
                {act.status === "nao_realizado" && (
                  <div style={{ background: "#fce8e8", color: "#c0444a", padding: "8px 12px", borderRadius: 8, fontSize: 12 }}>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ textAlign: "center", padding: "32px 24px", maxWidth: 360 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden="true">⚠️</div>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>{dialog.message}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDialog(null)}>Cancelar</button>
              <button className="btn-danger" style={{ flex: 1 }} onClick={dialog.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: add / edit activity ── */}
      {showAdd && (
        <div className="overlay" onClick={() => { setShowAdd(false); setEditingId(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-act-title">
            <h3 id="add-act-title" style={{ marginBottom: 4 }}>{editingId ? "Editar" : "Planejar"}: {form.category}</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              {editingId ? "Ajustando sua ação planejada." : `Adicionando uma ação para o pilar de ${form.category}.`}
            </p>

            <div className="field">
              <label htmlFor="act-title">O que você vai fazer?</label>
              <input id="act-title" style={fieldSt} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Tomar um chá na varanda" />
            </div>
            <div className="field">
              <label htmlFor="act-difficulty">Nível de desafio</label>
              <select id="act-difficulty" style={{ ...fieldSt, cursor: "pointer" }} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {BA_DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field">
                <label htmlFor="act-date">Qual dia?</label>
                <input id="act-date" type="date" style={fieldSt} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="act-time">Que horas?</label>
                <input id="act-time" type="time" style={fieldSt} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>

            {formError && <p className="error-msg" role="alert">{formError}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => { setShowAdd(false); setEditingId(null); }}>Cancelar</button>
              <button className="btn btn-sage" onClick={handleSave}>{editingId ? "Salvar Alterações" : "Agendar Ação"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: execute activity ── */}
      {executing && (
        <div className="overlay" onClick={() => setExecuting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="exec-act-title">
            <h3 id="exec-act-title" style={{ fontSize: 18 }}>Avaliar Atividade</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              <strong>{executing.title}</strong>
            </p>

            <div className="field" style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 13 }}>
                Você conseguiu realizar esta atividade?
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button className={`btn ${execForm.did_it ? "btn-sage" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => setExecForm({ ...execForm, did_it: true })}>Sim, eu fiz!</button>
                <button className={`btn ${!execForm.did_it ? "btn-accent" : "btn-outline"}`} style={{ flex: 1 }} onClick={() => setExecForm({ ...execForm, did_it: false })}>Não consegui</button>
              </div>
            </div>

            {execForm.did_it ? (
              <div style={{ animation: "fadeIn .3s ease" }}>
                {[
                  { id: "mood_before",  label: "Humor ANTES (0–10)",  val: execForm.mood_before,  key: "mood_before"  },
                  { id: "mood_after",   label: "Humor DEPOIS (0–10)", val: execForm.mood_after,   key: "mood_after"   },
                  { id: "energy_after", label: "Energia final (0–10)", val: execForm.energy_after, key: "energy_after" },
                ].map(({ id, label, val, key }) => (
                  <div className="field" key={id}>
                    <label htmlFor={id}>{label}</label>
                    <input id={id} type="range" min="0" max="10" value={val} onChange={(e) => setExecForm({ ...execForm, [key]: Number(e.target.value) })} style={{ width: "100%" }} aria-valuenow={val} />
                    <div style={{ textAlign: "center", fontWeight: "bold" }}>{val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="field" style={{ animation: "fadeIn .3s ease" }}>
                <label htmlFor="avoidance-reason">Principal motivo</label>
                <select id="avoidance-reason" style={fieldSt} value={execForm.avoidance_reason} onChange={(e) => setExecForm({ ...execForm, avoidance_reason: e.target.value })}>
                  {BA_AVOIDANCE_REASONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" onClick={() => setExecuting(null)}>Cancelar</button>
              <button className="btn btn-sage" onClick={handleExecute}>Salvar Registro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}