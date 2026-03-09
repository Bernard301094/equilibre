import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { toLocalDateStr } from "../../utils/dates";
import { validateDiaryEntry } from "../../utils/validation";
import { MOODS, DIARY_RISK_WORDS, LS_LAST_ACTION } from "../../utils/constants";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState from "../../components/ui/EmptyState";
import "./DiaryView.css";

const SLIDERS_CONFIG = [
  { id: "energy",     label: "⚡ Energia",    colorVar: "--diary-color-energy"     },
  { id: "anxiety",    label: "🌪️ Ansiedade",  colorVar: "--diary-color-anxiety"    },
  { id: "motivation", label: "🎯 Motivação",  colorVar: "--diary-color-motivation" },
];

const ENTRY_METRICS = [
  { key: "energy",     icon: "⚡",  label: "Energia",   colorClass: "diary-metric--energy"     },
  { key: "anxiety",    icon: "🌪️", label: "Ansiedade",  colorClass: "diary-metric--anxiety"    },
  { key: "motivation", icon: "🎯", label: "Motivação",  colorClass: "diary-metric--motivation" },
];

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

  /* ── Load data ── */
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
    setEnergy(entry.energy ?? 5); setAnxiety(entry.anxiety ?? 5);
    setMotivation(entry.motivation ?? 5);
    setFormError("");
    setActiveTab("hoje");
  };

  const sliderValues = { energy, anxiety, motivation };
  const sliderSetters = { energy: setEnergy, anxiety: setAnxiety, motivation: setMotivation };

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
            therapist_id:   session.therapist_id,
            patient_id:     session.id,
            patient_name:   session.name,
            exercise_title: `🚨 ALERTA: Paciente relatou humor "${moodLabel}" no diário.`,
            created_at:     new Date().toISOString(),
            read:           false,
          }, session.access_token).catch(() => {});
        }
      }

      if (editingEntry) {
        await db.update(
          "diary_entries",
          { id: editingEntry.id },
          { mood, text, energy, anxiety, motivation, updated_at: new Date().toISOString() },
          session.access_token
        );
        const updated = entries.map((e) =>
          e.id === editingEntry.id ? { ...e, mood, text, energy, anxiety, motivation } : e
        );
        setEntries(updated);
        if (editingEntry.date === today)
          setTodayEntry((p) => ({ ...p, mood, text, energy, anxiety, motivation }));
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
    } catch {
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

  const toggleReminder = () => {
    const next = !reminder;
    setReminder(next);
    db.update("users", { id: session.id }, { reminder_email: next }, session.access_token).catch(() => {});
  };

  if (loading) {
    return (
      <div className="diary-view__loading" aria-live="polite">
        Carregando diário...
      </div>
    );
  }

  /* ── Datos para gráficas ── */
  const chartData  = [...entries].slice(0, 14).reverse();
  const moodPoints = chartData.map((e) => e.mood);
  const moodLabels = chartData.map((e) =>
    new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  );
  const makeLabels = (arr) =>
    arr.map((e) =>
      new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    );

  const showForm = !todayEntry || !!editingEntry;

  const TABS = [
    { id: "hoje",      label: todayEntry && !editingEntry ? "✅ Hoje" : "✏️ Registrar" },
    { id: "historico", label: `📋 Histórico (${entries.length})` },
    { id: "grafico",   label: "📈 Evolução" },
  ];

  const avgOf = (key) =>
    entries.length
      ? (entries.reduce((a, e) => a + (e[key] ?? 0), 0) / entries.length).toFixed(1)
      : "—";

  return (
    <div className="diary-view page-fade-in">

      {/* ── Header ── */}
      <div className="diary-view__header">
        <div className="diary-view__header-left">
          <h2 className="diary-view__title">📓 Diário Emocional</h2>
          <p className="diary-view__date">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>

        <div className="diary-view__reminder">
          <span className="diary-view__reminder-label">⏰ Lembrete</span>
          <button
            className={["diary-view__toggle", reminder ? "diary-view__toggle--on" : "diary-view__toggle--off"].join(" ")}
            onClick={toggleReminder}
            role="switch"
            aria-checked={reminder}
            aria-label="Lembrete diário por e-mail"
          />
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="diary-view__tabs" role="tablist" aria-label="Seções do diário">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls={`diary-panel-${t.id}`}
            className={["diary-view__tab-btn", activeTab === t.id ? "diary-view__tab-btn--active" : ""].filter(Boolean).join(" ")}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════
          TAB: HOJE / REGISTRAR
      ══════════════════════════ */}
      <div
        role="tabpanel"
        id="diary-panel-hoje"
        hidden={activeTab !== "hoje"}
        className="diary-view__panel"
      >
        {/* Banner: ya registró hoy */}
        {todayEntry && !editingEntry && (
          <div className="diary-view__today-banner">
            <div className="diary-view__today-info">
              <span className="diary-view__today-emoji" aria-hidden="true">
                {MOODS.find((m) => m.val === todayEntry.mood)?.emoji ?? "😐"}
              </span>
              <div>
                <div className="diary-view__today-name">Já registraste hoje!</div>
                <div className="diary-view__today-sub">
                  {MOODS.find((m) => m.val === todayEntry.mood)?.label}
                  {" "}· ⚡{todayEntry.energy}/10 · 🎯{todayEntry.motivation}/10
                </div>
              </div>
            </div>
            <button
              className="diary-view__edit-btn"
              onClick={() => startEdit(todayEntry)}
            >
              ✏️ Editar
            </button>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="diary-view__form-grid">

            {/* Izquierda: humor + sliders */}
            <div className="diary-view__form-card">

              <div className="diary-view__section-label">Como você está?</div>
              <fieldset className="diary-view__mood-fieldset">
                <legend className="sr-only">Selecione seu humor</legend>
                <div className="diary-view__mood-row">
                  {MOODS.map((m) => (
                    <div key={m.val} className="diary-view__mood-item">
                      <button
                        type="button"
                        className={[
                          "diary-view__mood-btn",
                          mood === m.val ? "diary-view__mood-btn--selected" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => setMood(m.val)}
                        aria-pressed={mood === m.val}
                        aria-label={m.label}
                      >
                        {m.emoji}
                      </button>
                      <div className="diary-view__mood-label">{m.label}</div>
                    </div>
                  ))}
                </div>
              </fieldset>

              <div className="diary-view__sliders">
                {SLIDERS_CONFIG.map(({ id, label, colorVar }) => {
                  const val = sliderValues[id];
                  const set = sliderSetters[id];
                  return (
                    <div key={id} className="diary-view__slider-row">
                      <div className="diary-view__slider-header">
                        <label htmlFor={`slider-${id}`} className="diary-view__slider-label">
                          {label}
                        </label>
                        <span
                          className="diary-view__slider-val"
                          style={{ color: `var(${colorVar})` }}
                        >
                          {val}
                        </span>
                      </div>
                      <div className="diary-view__slider-track">
                        <div
                          className="diary-view__slider-fill"
                          style={{
                            width: `${val * 10}%`,
                            background: `var(${colorVar})`,
                          }}
                        />
                      </div>
                      <input
                        id={`slider-${id}`}
                        type="range"
                        min="0"
                        max="10"
                        value={val}
                        onChange={(e) => set(Number(e.target.value))}
                        className="diary-view__slider-input"
                        style={{ accentColor: `var(${colorVar})` }}
                        aria-valuenow={val}
                        aria-valuemin={0}
                        aria-valuemax={10}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Derecha: texto + guardar */}
            <div className="diary-view__form-card">
              <div className="diary-view__section-label">
                {editingEntry
                  ? `Editando: ${new Date(editingEntry.date + "T12:00:00").toLocaleDateString("pt-BR")}`
                  : "Como foi o seu dia?"}
              </div>

              <label htmlFor="diary-text" className="sr-only">Comentário livre</label>
              <textarea
                id="diary-text"
                className="diary-view__textarea"
                placeholder="Escreva livremente sobre o seu dia, sentimentos, pensamentos... (opcional)"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              {formError && (
                <p className="diary-view__error" role="alert">{formError}</p>
              )}

              <div className="diary-view__save-row">
                {editingEntry && (
                  <button
                    className="diary-view__cancel-btn"
                    onClick={resetForm}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  className="diary-view__save-btn"
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

      {/* ══════════════════════════
          TAB: HISTÓRICO
      ══════════════════════════ */}
      <div
        role="tabpanel"
        id="diary-panel-historico"
        hidden={activeTab !== "historico"}
        className="diary-view__panel"
      >
        {entries.length === 0 ? (
          <div className="diary-view__empty-card">
            <EmptyState icon="📖" message="Nenhum registo ainda. Começa hoje!" />
          </div>
        ) : (
          <div className="diary-view__history-grid">
            {entries.map((e) => {
              const m       = MOODS.find((x) => x.val === e.mood);
              const isToday = e.date === today;
              return (
                <div
                  key={e.id}
                  className={[
                    "diary-view__entry-card",
                    isToday ? "diary-view__entry-card--today" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="diary-view__entry-header">
                    <div className="diary-view__entry-info">
                      <span className="diary-view__entry-emoji" aria-hidden="true">
                        {m?.emoji ?? "😐"}
                      </span>
                      <div>
                        <div className="diary-view__entry-name">{m?.label}</div>
                        <div className="diary-view__entry-date">
                          {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                            weekday: "short", day: "2-digit", month: "short",
                          })}
                          {isToday && (
                            <span className="diary-view__today-badge">HOJE</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="diary-view__entry-actions">
                      <button
                        className="diary-view__entry-btn"
                        onClick={() => startEdit(e)}
                        aria-label={`Editar registo de ${e.date}`}
                      >✏️</button>
                      <button
                        className="diary-view__entry-btn diary-view__entry-btn--delete"
                        onClick={() => setDeletingEntry(e)}
                        aria-label={`Excluir registo de ${e.date}`}
                      >🗑️</button>
                    </div>
                  </div>

                  {/* Mini métricas */}
                  <div className={[
                    "diary-view__metrics-row",
                    e.text ? "diary-view__metrics-row--mb" : "",
                  ].filter(Boolean).join(" ")}>
                    {ENTRY_METRICS.map(({ key, icon, label, colorClass }) => (
                      <div key={key} className={`diary-view__metric ${colorClass}`}>
                        <div className="diary-view__metric-icon">{icon}</div>
                        <div className="diary-view__metric-val">{e[key] ?? "—"}</div>
                        <div className="diary-view__metric-label">{label}</div>
                      </div>
                    ))}
                  </div>

                  {e.text && (
                    <p className="diary-view__entry-text">
                      "{e.text.length > 120 ? e.text.slice(0, 120) + "…" : e.text}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════
          TAB: GRÁFICO
      ══════════════════════════ */}
      <div
        role="tabpanel"
        id="diary-panel-grafico"
        hidden={activeTab !== "grafico"}
        className="diary-view__panel"
      >
        {moodPoints.length < 2 ? (
          <div className="diary-view__empty-card">
            <EmptyState icon="📊" message="Precisa de pelo menos 2 registos para ver o gráfico." />
          </div>
        ) : (
          <>
            {/* Stats strip */}
            <div className="diary-view__stats-strip">
              {[
                { label: "Registos",       val: entries.length, icon: "📓" },
                { label: "Humor médio",    val: avgOf("mood"),       icon: "😊" },
                { label: "Energia média",  val: avgOf("energy"),     icon: "⚡" },
                { label: "Motivação média",val: avgOf("motivation"), icon: "🎯" },
              ].map(({ label, val, icon }) => (
                <div key={label} className="diary-view__stat-card">
                  <div className="diary-view__stat-icon">{icon}</div>
                  <div className="diary-view__stat-val">{val}</div>
                  <div className="diary-view__stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Gráfica de humor */}
            <div className="diary-view__chart-card">
              <h3 className="diary-view__chart-title">Evolução do Humor</h3>
              <p className="diary-view__chart-legend">1 = Muito difícil · 5 = Ótimo</p>
              <MiniLineChart
                points={moodPoints}
                labels={moodLabels}
                height={160}
                color="var(--orange)"
              />
            </div>

            {/* Gráficas secundarias */}
            <div className="diary-view__chart-grid">
              <div className="diary-view__chart-card">
                <h3 className="diary-view__chart-title">⚡ Energia</h3>
                <MiniLineChart
                  points={chartData.map((e) => e.energy ?? 0)}
                  labels={makeLabels(chartData)}
                  height={110}
                  color="#f59e0b"
                />
              </div>
              <div className="diary-view__chart-card">
                <h3 className="diary-view__chart-title">🎯 Motivação</h3>
                <MiniLineChart
                  points={chartData.map((e) => e.motivation ?? 0)}
                  labels={makeLabels(chartData)}
                  height={110}
                  color="var(--blue-dark)"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Confirmar eliminación ── */}
      {deletingEntry && (
        <div className="diary-view__delete-overlay" onClick={() => setDeletingEntry(null)}>
          <div
            className="diary-view__delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-diary-title"
          >
            <div className="diary-view__delete-icon" aria-hidden="true">🗑️</div>
            <div id="del-diary-title" className="diary-view__delete-title">Excluir registo?</div>
            <div className="diary-view__delete-desc">Esta ação não pode ser desfeita.</div>
            <div className="diary-view__delete-actions">
              <button
                className="diary-view__delete-btn diary-view__delete-btn--cancel"
                onClick={() => setDeletingEntry(null)}
              >
                Cancelar
              </button>
              <button
                className="diary-view__delete-btn diary-view__delete-btn--confirm"
                onClick={confirmDelete}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}