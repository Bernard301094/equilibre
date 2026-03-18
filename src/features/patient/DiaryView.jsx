import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { toLocalDateStr } from "../../utils/dates";
import { validateDiaryEntry } from "../../utils/validation";
import { MOOD_OPTIONS, resolveMood, DIARY_RISK_WORDS, LS_LAST_ACTION } from "../../utils/constants";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState from "../../components/ui/EmptyState";
import { notifyDiaryEntry } from "../../services/pushSender";
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

const MOODS_ROW_1 = MOOD_OPTIONS.slice(0, 5);
const MOODS_ROW_2 = MOOD_OPTIONS.slice(5);

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

  const [selectedMoodId, setSelectedMoodId] = useState(null);
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
        if (te) {
          setTodayEntry(te);
          setActiveTab("historico");
        }
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
    setSelectedMoodId(null);
    setText(""); setEnergy(5); setAnxiety(5); setMotivation(5);
    setEditingEntry(null); setFormError("");
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    const resolved = resolveMood(entry.mood_id, entry.mood);
    setSelectedMoodId(resolved?.id ?? null);
    setText(entry.text || "");
    setEnergy(entry.energy ?? 5);
    setAnxiety(entry.anxiety ?? 5);
    setMotivation(entry.motivation ?? 5);
    setFormError("");
    setActiveTab("hoje");
  };

  const sliderValues  = { energy, anxiety, motivation };
  const sliderSetters = { energy: setEnergy, anxiety: setAnxiety, motivation: setMotivation };

  const save = async () => {
    const selectedMood = MOOD_OPTIONS.find((m) => m.id === selectedMoodId);
    const err = validateDiaryEntry({ mood: selectedMood?.val ?? null });
    if (err) { setFormError(err); return; }
    if (inflightRef.current || saving) return;
    inflightRef.current = true;
    setSaving(true);
    setFormError("");

    const moodVal = selectedMood.val;

    try {
      if (session.therapist_id && !editingEntry) {
        const textLower = (text || "").toLowerCase();
        const hasRisk   = moodVal === 1 || DIARY_RISK_WORDS.some((w) => textLower.includes(w));
        if (hasRisk) {
          db.insert("notifications", {
            therapist_id:   session.therapist_id,
            patient_id:     session.id,
            patient_name:   session.name,
            exercise_title: `🚨 ALERTA: Paciente relatou humor "${selectedMood.label}" no diário.`,
            created_at:     new Date().toISOString(),
            read:           false,
          }, session.access_token).catch(() => {});
        }
      }

      if (editingEntry) {
        await db.update(
          "diary_entries",
          { id: editingEntry.id },
          {
            mood:       moodVal,
            mood_id:    selectedMoodId,
            text,
            energy, anxiety, motivation,
            updated_at: new Date().toISOString(),
          },
          session.access_token
        );
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingEntry.id
              ? { ...e, mood: moodVal, mood_id: selectedMoodId, text, energy, anxiety, motivation }
              : e
          )
        );
        if (editingEntry.date === today)
          setTodayEntry((p) => ({ ...p, mood: moodVal, mood_id: selectedMoodId, text, energy, anxiety, motivation }));
        resetForm();
        setActiveTab("historico");
      } else {
        const payload = {
          patient_id: session.id,
          date:       today,
          mood:       moodVal,
          mood_id:    selectedMoodId,
          text,
          energy,
          anxiety,
          motivation,
          created_at: new Date().toISOString(),
        };

        const saved = await db.insert("diary_entries", payload, session.access_token);
        const insertedEntry = saved?.data ?? saved;
        const finalEntry = (insertedEntry && insertedEntry.id)
          ? insertedEntry
          : { ...payload, id: `tmp_${Date.now()}` };

        setTodayEntry(finalEntry);
        setEntries((prev) => [finalEntry, ...prev]);
        resetForm();
        setActiveTab("historico");
        localStorage.setItem(LS_LAST_ACTION, String(Date.now()));

        // Notifica terapeuta via push — fire-and-forget
        if (session.therapist_id) {
          notifyDiaryEntry(session, session.therapist_id, session.name).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[DiaryView] Erro ao salvar entrada:", err);
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
        <span className="diary-view__loading-icon" aria-hidden="true">📓</span>
        <p>Carregando diário...</p>
      </div>
    );
  }

  const chartData  = [...entries].slice(0, 14).reverse();
  const moodPoints = chartData.map((e) => e.mood ?? 0);
  const moodLabels = chartData.map((e) =>
    new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  );
  const makeLabels = (arr) =>
    arr.map((e) =>
      new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    );

  const avgOf = (key) =>
    entries.length
      ? (entries.reduce((a, e) => a + (e[key] ?? 0), 0) / entries.length).toFixed(1)
      : "—";

  const showForm = !todayEntry || !!editingEntry;

  const TABS = [
    { id: "hoje",      label: todayEntry && !editingEntry ? "✅ Hoje" : "✏️ Registrar" },
    { id: "historico", label: `📋 Histórico (${entries.length})` },
    { id: "grafico",   label: "📈 Evolução" },
  ];

  return (
    <div className="diary-view page-fade-in">

      <header className="diary-view__header">
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
      </header>

      <div className="diary-view__tabs" role="tablist" aria-label="Seções do diário">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            aria-controls={`diary-panel-${t.id}`}
            className={[
              "diary-view__tab-btn",
              activeTab === t.id ? "diary-view__tab-btn--active" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "hoje" && (
        <div role="tabpanel" id="diary-panel-hoje" className="diary-view__panel">
          {todayEntry && !editingEntry && (
            <div className="diary-view__today-banner">
              <div className="diary-view__today-info">
                <span className="diary-view__today-emoji" aria-hidden="true">
                  {resolveMood(todayEntry.mood_id, todayEntry.mood)?.emoji ?? "😐"}
                </span>
                <div>
                  <p className="diary-view__today-name">Já registraste hoje!</p>
                  <p className="diary-view__today-sub">
                    {resolveMood(todayEntry.mood_id, todayEntry.mood)?.label}
                    {" "}· ⚡{todayEntry.energy}/10 · 🎯{todayEntry.motivation}/10
                  </p>
                </div>
              </div>
              <button className="diary-view__edit-btn" onClick={() => startEdit(todayEntry)}>✏️ Editar</button>
            </div>
          )}

          {showForm && (
            <div className="diary-view__form-grid">
              <div className="diary-view__form-card">
                <p className="diary-view__section-label">Como você está?</p>
                <fieldset className="diary-view__mood-fieldset">
                  <legend className="sr-only">Selecione seu humor</legend>
                  <div className="diary-view__mood-row">
                    {MOODS_ROW_1.map((m) => (
                      <MoodButton key={m.id} mood={m} selected={selectedMoodId === m.id} onSelect={() => setSelectedMoodId(m.id)} />
                    ))}
                  </div>
                  <div className="diary-view__mood-row diary-view__mood-row--second">
                    {MOODS_ROW_2.map((m) => (
                      <MoodButton key={m.id} mood={m} selected={selectedMoodId === m.id} onSelect={() => setSelectedMoodId(m.id)} />
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
                          <label htmlFor={`slider-${id}`} className="diary-view__slider-label">{label}</label>
                          <span className="diary-view__slider-val" style={{ color: `var(${colorVar})` }} aria-live="polite">{val}</span>
                        </div>
                        <div className="diary-view__slider-track" aria-hidden="true">
                          <div className="diary-view__slider-fill" style={{ width: `${val * 10}%`, background: `var(${colorVar})` }} />
                        </div>
                        <input
                          id={`slider-${id}`} type="range" min="0" max="10" value={val}
                          onChange={(e) => set(Number(e.target.value))}
                          className="diary-view__slider-input"
                          style={{ accentColor: `var(${colorVar})` }}
                          aria-valuenow={val} aria-valuemin={0} aria-valuemax={10}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="diary-view__form-card diary-view__form-card--text">
                <p className="diary-view__section-label">
                  {editingEntry
                    ? `Editando: ${new Date(editingEntry.date + "T12:00:00").toLocaleDateString("pt-BR")}`
                    : "Como foi o seu dia?"}
                </p>
                <label htmlFor="diary-text" className="sr-only">Comentário livre</label>
                <textarea
                  id="diary-text"
                  className="diary-view__textarea"
                  placeholder="Escreva livremente sobre o seu dia, sentimentos, pensamentos… (opcional)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                {formError && <p className="diary-view__error" role="alert">{formError}</p>}
                <div className="diary-view__save-row">
                  {editingEntry && (
                    <button className="diary-view__cancel-btn" onClick={resetForm}>Cancelar</button>
                  )}
                  <button
                    className="diary-view__save-btn"
                    onClick={save}
                    disabled={selectedMoodId === null || saving}
                    aria-busy={saving}
                  >
                    {saving ? "Salvando…" : editingEntry ? "Atualizar registo" : "💾 Salvar meu dia"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "historico" && (
        <div role="tabpanel" id="diary-panel-historico" className="diary-view__panel">
          {entries.length === 0 ? (
            <div className="diary-view__empty-card">
              <EmptyState icon="📖" message="Nenhum registo ainda. Começa hoje!" />
            </div>
          ) : (
            <div className="diary-view__history-grid">
              {entries.map((e) => {
                const m       = resolveMood(e.mood_id, e.mood);
                const isToday = e.date === today;
                return (
                  <article
                    key={e.id}
                    className={["diary-view__entry-card", isToday ? "diary-view__entry-card--today" : ""].filter(Boolean).join(" ")}
                  >
                    <div className="diary-view__entry-header">
                      <div className="diary-view__entry-info">
                        <span className="diary-view__entry-emoji" aria-hidden="true">{m?.emoji ?? "😐"}</span>
                        <div>
                          <p className="diary-view__entry-name">{m?.label}</p>
                          <p className="diary-view__entry-date">
                            {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                            {isToday && <span className="diary-view__today-badge">HOJE</span>}
                          </p>
                        </div>
                      </div>
                      <div className="diary-view__entry-actions">
                        <button className="diary-view__entry-btn" onClick={() => startEdit(e)} aria-label={`Editar registo de ${e.date}`}>✏️</button>
                        <button className="diary-view__entry-btn diary-view__entry-btn--delete" onClick={() => setDeletingEntry(e)} aria-label={`Excluir registo de ${e.date}`}>🗑️</button>
                      </div>
                    </div>
                    <div className={["diary-view__metrics-row", e.text ? "diary-view__metrics-row--mb" : ""].filter(Boolean).join(" ")}>
                      {ENTRY_METRICS.map(({ key, icon, label, colorClass }) => (
                        <div key={key} className={`diary-view__metric ${colorClass}`}>
                          <span className="diary-view__metric-icon" aria-hidden="true">{icon}</span>
                          <span className="diary-view__metric-val">{e[key] ?? "—"}</span>
                          <span className="diary-view__metric-label">{label}</span>
                        </div>
                      ))}
                    </div>
                    {e.text && (
                      <p className="diary-view__entry-text">"{e.text.length > 120 ? e.text.slice(0, 120) + "…" : e.text}"</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "grafico" && (
        <div role="tabpanel" id="diary-panel-grafico" className="diary-view__panel">
          {moodPoints.length < 2 ? (
            <div className="diary-view__empty-card">
              <EmptyState icon="📊" message="Precisa de pelo menos 2 registos para ver o gráfico." />
            </div>
          ) : (
            <>
              <div className="diary-view__stats-strip">
                {[
                  { label: "Registos",        val: entries.length,      icon: "📓" },
                  { label: "Humor médio",     val: avgOf("mood"),        icon: "😊" },
                  { label: "Energia média",   val: avgOf("energy"),      icon: "⚡" },
                  { label: "Motivação média", val: avgOf("motivation"),  icon: "🎯" },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="diary-view__stat-card">
                    <span className="diary-view__stat-icon" aria-hidden="true">{icon}</span>
                    <span className="diary-view__stat-val">{val}</span>
                    <span className="diary-view__stat-label">{label}</span>
                  </div>
                ))}
              </div>
              <div className="diary-view__chart-card">
                <h3 className="diary-view__chart-title">Evolução do Humor</h3>
                <p className="diary-view__chart-legend">1 = Muito difícil · 5 = Ótimo</p>
                <MiniLineChart points={moodPoints} labels={moodLabels} height={160} color="var(--orange)" />
              </div>
              <div className="diary-view__chart-grid">
                <div className="diary-view__chart-card">
                  <h3 className="diary-view__chart-title">⚡ Energia</h3>
                  <MiniLineChart points={chartData.map((e) => e.energy ?? 0)} labels={makeLabels(chartData)} height={110} color="#f59e0b" />
                </div>
                <div className="diary-view__chart-card">
                  <h3 className="diary-view__chart-title">🎯 Motivação</h3>
                  <MiniLineChart points={chartData.map((e) => e.motivation ?? 0)} labels={makeLabels(chartData)} height={110} color="var(--blue-dark)" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {deletingEntry && (
        <div className="diary-view__delete-overlay" onClick={() => setDeletingEntry(null)}>
          <div
            className="diary-view__delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="del-diary-title"
          >
            <span className="diary-view__delete-icon" aria-hidden="true">🗑️</span>
            <h3 id="del-diary-title" className="diary-view__delete-title">Excluir registo?</h3>
            <p className="diary-view__delete-desc">Esta ação não pode ser desfeita.</p>
            <div className="diary-view__delete-actions">
              <button className="diary-view__delete-btn diary-view__delete-btn--cancel" onClick={() => setDeletingEntry(null)}>Cancelar</button>
              <button className="diary-view__delete-btn diary-view__delete-btn--confirm" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MoodButton({ mood, selected, onSelect }) {
  return (
    <div className="diary-view__mood-item">
      <button
        type="button"
        className={["diary-view__mood-btn", selected ? "diary-view__mood-btn--selected" : ""].filter(Boolean).join(" ")}
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={mood.label}
        style={selected ? { "--mood-color": mood.color } : {}}
      >
        <span aria-hidden="true">{mood.emoji}</span>
      </button>
      <span className="diary-view__mood-label">{mood.label}</span>
    </div>
  );
}
