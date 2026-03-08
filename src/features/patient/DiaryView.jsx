import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { toLocalDateStr } from "../../utils/dates";
import { validateDiaryEntry } from "../../utils/validation";
import { MOODS, DIARY_RISK_WORDS, LS_LAST_ACTION } from "../../utils/constants";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState from "../../components/ui/EmptyState";

export default function PatientDiary({ session }) {
  const today = toLocalDateStr();

  const [entries,       setEntries]       = useState([]);
  const [todayEntry,    setTodayEntry]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [editingEntry,  setEditingEntry]  = useState(null);
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [reminder,      setReminder]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [formError,     setFormError]     = useState("");
  const [activeTab,     setActiveTab]     = useState("hoje");
  const inflightRef = useRef(false);

  const [mood,       setMood]       = useState(null);
  const [text,       setText]       = useState("");
  const [energy,     setEnergy]     = useState(5);
  const [anxiety,    setAnxiety]    = useState(5);
  const [motivation, setMotivation] = useState(5);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [e, u] = await Promise.all([
          db.query("diary_entries", { filter: { patient_id: session.id }, order: "date.desc" }, session.access_token),
          db.query("users", { filter: { id: session.id }, select: "reminder_email" }, session.access_token),
        ]);
        if (!active) return;
        const list = Array.isArray(e) ? e : [];
        setEntries(list);
        const te = list.find((x) => x.date === today);
        if (te) { setTodayEntry(te); setActiveTab("historico"); }
        if (Array.isArray(u) && u.length > 0) setReminder(!!u[0].reminder_email);
      } catch (err) {
        console.error("[DiaryView]", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token, today]);

  const resetForm = () => {
    setMood(null); setText(""); setEnergy(5); setAnxiety(5); setMotivation(5);
    setEditingEntry(null); setFormError("");
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setMood(entry.mood); setText(entry.text || "");
    setEnergy(entry.energy ?? 5); setAnxiety(entry.anxiety ?? 5); setMotivation(entry.motivation ?? 5);
    setFormError("");
    setActiveTab("hoje");
  };

  const save = async () => {
    const err = validateDiaryEntry({ mood });
    if (err) { setFormError(err); return; }
    if (inflightRef.current || saving) return;
    inflightRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      if (session.therapist_id && !editingEntry) {
        const textLower = (text || "").toLowerCase();
        const hasRisk = mood === 1 || DIARY_RISK_WORDS.some((w) => textLower.includes(w));
        if (hasRisk) {
          const moodLabel = MOODS.find((m) => m.val === mood)?.label ?? "";
          db.insert("notifications", {
            therapist_id: session.therapist_id, patient_id: session.id,
            patient_name: session.name,
            exercise_title: `🚨 ALERTA: Paciente relatou humor "${moodLabel}" no diário.`,
            created_at: new Date().toISOString(), read: false,
          }, session.access_token).catch(() => {});
        }
      }

      if (editingEntry) {
        await db.update("diary_entries", { id: editingEntry.id },
          { mood, text, energy, anxiety, motivation, updated_at: new Date().toISOString() },
          session.access_token
        );
        const updated = entries.map((e) =>
          e.id === editingEntry.id ? { ...e, mood, text, energy, anxiety, motivation } : e
        );
        setEntries(updated);
        if (editingEntry.date === today) setTodayEntry((p) => ({ ...p, mood, text, energy, anxiety, motivation }));
        resetForm();
        setActiveTab("historico");
      } else {
        const entry = {
          id: "d" + Date.now(), patient_id: session.id,
          date: today, mood, text, energy, anxiety, motivation,
          created_at: new Date().toISOString(),
        };
        await db.insert("diary_entries", entry, session.access_token);
        setTodayEntry(entry);
        setEntries((prev) => [entry, ...prev]);
        resetForm();
        setActiveTab("historico");
        localStorage.setItem(LS_LAST_ACTION, String(Date.now()));
      }
    } catch (e) {
      setFormError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
      inflightRef.current = false;
    }
  };

  const confirmDelete = async () => {
    if (!deletingEntry) return;
    try {
      await db.delete("diary_entries", { id: deletingEntry.id }, session.access_token);
      const updated = entries.filter((e) => e.id !== deletingEntry.id);
      setEntries(updated);
      if (deletingEntry.date === today) setTodayEntry(null);
      if (editingEntry?.id === deletingEntry.id) resetForm();
      setDeletingEntry(null);
    } catch (e) {
      alert("Erro ao excluir: " + e.message);
    }
  };

  const toggleReminder = async () => {
    const next = !reminder;
    setReminder(next);
    db.update("users", { id: session.id }, { reminder_email: next }, session.access_token).catch(() => {});
  };

  if (loading) return <p className="dv-loading">Carregando diário...</p>;

  const chartData  = [...entries].slice(0, 14).reverse();
  const moodPoints = chartData.map((e) => e.mood);
  const moodLabels = chartData.map((e) =>
    new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  );

  const showForm = !todayEntry || !!editingEntry;

  const TABS = [
    { id: "hoje",      label: todayEntry && !editingEntry ? "✅ Hoje" : "✏️ Registrar" },
    { id: "historico", label: `📋 Histórico (${entries.length})` },
    { id: "grafico",   label: "📈 Evolução" },
  ];

  const SLIDERS = [
    { id: "energy",     label: "⚡ Energia",   val: energy,     set: setEnergy,     color: "#f59e0b" },
    { id: "anxiety",    label: "🌪️ Ansiedade", val: anxiety,    set: setAnxiety,    color: "#ef4444" },
    { id: "motivation", label: "🎯 Motivação", val: motivation, set: setMotivation, color: "var(--blue-dark)" },
  ];

  return (
    <div className="dv-wrapper page-fade-in">

      {/* ── Header ── */}
      <div className="dv-header">
        <div>
          <h2 className="dv-title">📓 Diário Emocional</h2>
          <p className="dv-date">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Reminder toggle */}
        <div className="dv-reminder-wrap">
          <span className="dv-reminder-label">⏰ Lembrete</span>
          <button
            className={`toggle ${reminder ? "on" : "off"}`}
            onClick={toggleReminder}
            role="switch"
            aria-checked={reminder}
            aria-label="Lembrete diário por e-mail"
          />
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="dv-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`dv-tab-btn${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB: HOJE / REGISTRAR
      ══════════════════════════════════ */}
      {activeTab === "hoje" && (
        <div className="dv-tab-content">

          {/* Already registered today */}
          {todayEntry && !editingEntry && (
            <div className="dv-today-banner">
              <div className="dv-today-inner">
                <span className="dv-today-emoji" aria-hidden="true">
                  {MOODS.find((m) => m.val === todayEntry.mood)?.emoji ?? "😐"}
                </span>
                <div>
                  <div className="dv-today-name">Já registraste hoje!</div>
                  <div className="dv-today-sub">
                    {MOODS.find((m) => m.val === todayEntry.mood)?.label} · ⚡{todayEntry.energy}/10 · 🎯{todayEntry.motivation}/10
                  </div>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => startEdit(todayEntry)}>
                ✏️ Editar
              </button>
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="dv-form-grid">

              {/* Left — mood + sliders */}
              <div className="card dv-form-left">
                <div>
                  <div className="dv-section-label">Como você está?</div>
                  <fieldset className="dv-mood-fieldset">
                    <legend className="sr-only">Selecione seu humor</legend>
                    <div className="dv-mood-row">
                      {MOODS.map((m) => (
                        <div key={m.val} className="dv-mood-item">
                          <button
                            type="button"
                            className={`mood-btn dv-mood-btn${mood === m.val ? " sel" : ""}`}
                            onClick={() => setMood(m.val)}
                            aria-pressed={mood === m.val}
                            aria-label={m.label}
                          >
                            {m.emoji}
                          </button>
                          <div className="dv-mood-label">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div className="dv-sliders">
                  {SLIDERS.map(({ id, label, val, set, color }) => (
                    <div key={id} className="dv-slider-row">
                      <div className="dv-slider-header">
                        <label htmlFor={`slider-${id}`} className="dv-slider-label">
                          {label}
                        </label>
                        <span className="dv-slider-val" style={{ color }}>{val}</span>
                      </div>
                      <div className="dv-slider-track">
                        <div
                          className="dv-slider-fill"
                          style={{ width: `${val * 10}%`, background: color }}
                        />
                      </div>
                      <input
                        id={`slider-${id}`}
                        type="range"
                        min="0"
                        max="10"
                        value={val}
                        onChange={(e) => set(Number(e.target.value))}
                        className="dv-slider-input"
                        style={{ accentColor: color }}
                        aria-valuenow={val}
                        aria-valuemin={0}
                        aria-valuemax={10}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — text + save */}
              <div className="card dv-form-right">
                <div className="dv-section-label">
                  {editingEntry
                    ? `Editando: ${new Date(editingEntry.date + "T12:00:00").toLocaleDateString("pt-BR")}`
                    : "Como foi o seu dia?"}
                </div>

                <label htmlFor="diary-text" className="sr-only">Comentário livre</label>
                <textarea
                  id="diary-text"
                  className="q-textarea dv-diary-textarea"
                  placeholder="Escreva livremente sobre o seu dia, sentimentos, pensamentos... (opcional)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {formError && <p className="error-msg" role="alert">{formError}</p>}

                <div className="dv-save-row">
                  {editingEntry && (
                    <button className="btn btn-outline dv-cancel-btn" onClick={resetForm}>
                      Cancelar
                    </button>
                  )}
                  <button
                    className="btn btn-sage dv-save-btn"
                    onClick={save}
                    disabled={mood === null || saving}
                    aria-busy={saving}
                  >
                    {saving ? "Salvando..." : editingEntry ? "Atualizar registo" : "💾 Salvar meu dia"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: HISTÓRICO
      ══════════════════════════════════ */}
      {activeTab === "historico" && (
        <div className="dv-tab-content">
          {entries.length === 0 ? (
            <div className="card dv-empty-card">
              <EmptyState icon="📖" message="Nenhum registo ainda. Começa hoje!" />
            </div>
          ) : (
            <div className="dv-history-grid">
              {entries.map((e) => {
                const m       = MOODS.find((x) => x.val === e.mood);
                const isToday = e.date === today;
                return (
                  <div
                    key={e.id}
                    className={`card dv-entry-card${isToday ? " dv-entry-card--today" : ""}`}
                  >
                    <div className="dv-card-header">
                      <div className="dv-card-info">
                        <span className="dv-entry-emoji" aria-hidden="true">
                          {m?.emoji ?? "😐"}
                        </span>
                        <div>
                          <div className="dv-entry-name">{m?.label}</div>
                          <div className="dv-entry-date">
                            {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                              weekday: "short", day: "2-digit", month: "short",
                            })}
                            {isToday && (
                              <span className="dv-today-badge">HOJE</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="dv-entry-actions">
                        <button
                          onClick={() => startEdit(e)}
                          aria-label="Editar"
                          className="dv-entry-btn dv-entry-btn--edit"
                        >✏️</button>
                        <button
                          onClick={() => setDeletingEntry(e)}
                          aria-label="Excluir"
                          className="dv-entry-btn dv-entry-btn--delete"
                        >🗑️</button>
                      </div>
                    </div>

                    {/* Mini metrics */}
                    <div className={`dv-metrics-row${e.text ? " dv-metrics-row--mb" : ""}`}>
                      {[
                        { icon: "⚡", val: e.energy,     color: "#f59e0b",          label: "Energia"    },
                        { icon: "🌪️", val: e.anxiety,    color: "#ef4444",          label: "Ansiedade"  },
                        { icon: "🎯", val: e.motivation, color: "var(--blue-dark)", label: "Motivação"  },
                      ].map(({ icon, val, color, label }) => (
                        <div key={label} className="dv-metric-item">
                          <div className="dv-metric-icon">{icon}</div>
                          <div className="dv-metric-val" style={{ color }}>
                            {val ?? "—"}
                          </div>
                          <div className="dv-metric-label">{label}</div>
                        </div>
                      ))}
                    </div>

                    {e.text && (
                      <p className="dv-entry-text">
                        "{e.text.length > 120 ? e.text.slice(0, 120) + "…" : e.text}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════
          TAB: GRÁFICO
      ══════════════════════════════════ */}
      {activeTab === "grafico" && (
        <div className="dv-tab-content dv-chart-tab">
          {moodPoints.length < 2 ? (
            <div className="card dv-empty-card">
              <EmptyState icon="📊" message="Precisa de pelo menos 2 registos para ver o gráfico." />
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="dv-stats-strip">
                {[
                  { label: "Registos",        val: entries.length, icon: "📓" },
                  { label: "Humor médio",      val: (entries.reduce((a, e) => a + (e.mood ?? 0), 0) / entries.length).toFixed(1), icon: "😊" },
                  { label: "Energia média",    val: (entries.reduce((a, e) => a + (e.energy ?? 0), 0) / entries.length).toFixed(1), icon: "⚡" },
                  { label: "Motivação média",  val: (entries.reduce((a, e) => a + (e.motivation ?? 0), 0) / entries.length).toFixed(1), icon: "🎯" },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="card dv-stat-card">
                    <div className="dv-stat-icon">{icon}</div>
                    <div className="dv-stat-val">{val}</div>
                    <div className="dv-stat-label">{label}</div>
                  </div>
                ))}
              </div>

              {/* Mood chart */}
              <div className="card dv-chart-card">
                <h3 className="dv-chart-title">Evolução do Humor</h3>
                <p className="dv-chart-desc">1 = Muito difícil · 5 = Ótimo</p>
                <MiniLineChart points={moodPoints} labels={moodLabels} height={160} color="var(--orange)" />
              </div>

              {/* Energy + Motivation charts side by side */}
              <div className="dv-chart-grid">
                <div className="card">
                  <h3 className="dv-chart-title dv-chart-title--energy">⚡ Energia</h3>
                  <MiniLineChart
                    points={[...entries].slice(0, 14).reverse().map((e) => e.energy ?? 0)}
                    labels={[...entries].slice(0, 14).reverse().map((e) =>
                      new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                    )}
                    height={110}
                    color="#f59e0b"
                  />
                </div>
                <div className="card">
                  <h3 className="dv-chart-title">🎯 Motivação</h3>
                  <MiniLineChart
                    points={[...entries].slice(0, 14).reverse().map((e) => e.motivation ?? 0)}
                    labels={[...entries].slice(0, 14).reverse().map((e) =>
                      new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                    )}
                    height={110}
                    color="var(--blue-dark)"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deletingEntry && (
        <div className="delete-overlay" onClick={() => setDeletingEntry(null)}>
          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-diary-title"
          >
            <div className="delete-icon dv-del-icon" aria-hidden="true">🗑️</div>
            <div id="del-diary-title" className="delete-title">Excluir registo?</div>
            <div className="delete-desc">Esta ação não pode ser desfeita.</div>
            <div className="logout-dialog-actions">
              <button className="btn btn-outline" onClick={() => setDeletingEntry(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}