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
  const [activeTab,     setActiveTab]     = useState("hoje"); // "hoje" | "historico" | "grafico"
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

  if (loading) return <p style={{ color: "var(--text-muted)", padding: 20 }}>Carregando diário...</p>;

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "fadeUp .4s ease" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, color: "var(--text)", letterSpacing: "-.3px" }}>
            📓 Diário Emocional
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 3 }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Reminder toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "1px solid rgba(134,188,222,0.2)", borderRadius: 12, padding: "10px 14px", boxShadow: "var(--shadow-sm)" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>⏰ Lembrete</span>
          <button
            className={`toggle ${reminder ? "on" : "off"}`}
            onClick={toggleReminder}
            role="switch" aria-checked={reminder}
            aria-label="Lembrete diário por e-mail"
          />
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, background: "var(--cream)", border: "1.5px solid var(--warm)", borderRadius: 14, padding: 4, marginBottom: 22 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: "10px 8px", border: "none", borderRadius: 10,
              fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all .2s cubic-bezier(0.34,1.2,0.64,1)",
              background: activeTab === t.id ? "var(--white)" : "transparent",
              color: activeTab === t.id ? "var(--blue-dark)" : "var(--text-muted)",
              boxShadow: activeTab === t.id ? "0 2px 10px rgba(23,82,124,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          TAB: HOJE / REGISTRAR
      ══════════════════════════════════ */}
      {activeTab === "hoje" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Already registered today */}
          {todayEntry && !editingEntry && (
            <div style={{ background: "linear-gradient(135deg,rgba(23,82,124,0.06),rgba(134,188,222,0.08))", border: "1.5px solid rgba(134,188,222,0.3)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 40 }}>
                  {MOODS.find((m) => m.val === todayEntry.mood)?.emoji ?? "😐"}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--blue-dark)" }}>
                    Já registraste hoje!
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
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
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>

              {/* Left — mood + sliders */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 14 }}>
                    Como você está?
                  </div>
                  <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                    <legend className="sr-only">Selecione seu humor</legend>
                    <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                      {MOODS.map((m) => (
                        <div key={m.val} style={{ textAlign: "center", flex: 1 }}>
                          <button
                            type="button"
                            className={`mood-btn ${mood === m.val ? "sel" : ""}`}
                            style={{ width: "100%", fontSize: 26 }}
                            onClick={() => setMood(m.val)}
                            aria-pressed={mood === m.val}
                            aria-label={m.label}
                          >
                            {m.emoji}
                          </button>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 5, fontWeight: 500 }}>
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { id: "energy",     label: "⚡ Energia",    val: energy,     set: setEnergy,     color: "#f59e0b" },
                    { id: "anxiety",    label: "🌪️ Ansiedade",  val: anxiety,    set: setAnxiety,    color: "#ef4444" },
                    { id: "motivation", label: "🎯 Motivação",  val: motivation, set: setMotivation, color: "var(--blue-dark)" },
                  ].map(({ id, label, val, set, color }) => (
                    <div key={id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, fontWeight: 500 }}>
                        <label htmlFor={`slider-${id}`} style={{ color: "var(--text-muted)" }}>{label}</label>
                        <span style={{ fontWeight: 700, color, fontSize: 15 }}>{val}</span>
                      </div>
                      <div style={{ position: "relative", height: 6, background: "var(--warm)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${val * 10}%`, background: color, borderRadius: 4, transition: "width .2s" }} />
                      </div>
                      <input
                        id={`slider-${id}`}
                        type="range" min="0" max="10" value={val}
                        onChange={(e) => set(Number(e.target.value))}
                        style={{ width: "100%", marginTop: 4, accentColor: color, opacity: 0, height: 6, cursor: "pointer", position: "relative", zIndex: 1, marginTop: -10 }}
                        aria-valuenow={val} aria-valuemin={0} aria-valuemax={10}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — text + save */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)" }}>
                  {editingEntry ? `Editando: ${new Date(editingEntry.date + "T12:00:00").toLocaleDateString("pt-BR")}` : "Como foi o seu dia?"}
                </div>

                <label htmlFor="diary-text" className="sr-only">Comentário livre</label>
                <textarea
                  id="diary-text"
                  className="q-textarea"
                  placeholder="Escreva livremente sobre o seu dia, sentimentos, pensamentos... (opcional)"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  style={{ flex: 1, minHeight: 160, resize: "none" }}
                />

                {formError && <p className="error-msg" role="alert">{formError}</p>}

                <div style={{ display: "flex", gap: 10 }}>
                  {editingEntry && (
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={resetForm}>
                      Cancelar
                    </button>
                  )}
                  <button
                    className="btn btn-sage"
                    style={{ flex: 2, padding: 14, fontSize: 15 }}
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
        <div style={{ flex: 1 }}>
          {entries.length === 0 ? (
            <div className="card" style={{ height: "100%" }}>
              <EmptyState icon="📖" message="Nenhum registo ainda. Começa hoje!" />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {entries.map((e) => {
                const m       = MOODS.find((x) => x.val === e.mood);
                const isToday = e.date === today;
                return (
                  <div
                    key={e.id}
                    className="card"
                    style={{ borderTop: `3px solid ${isToday ? "var(--blue-dark)" : "var(--warm)"}`, transition: "all .2s" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 32 }} aria-hidden="true">{m?.emoji ?? "😐"}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{m?.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                            {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                            {isToday && (
                              <span style={{ marginLeft: 6, background: "var(--blue-dark)", color: "white", fontSize: 9, padding: "2px 6px", borderRadius: 8, fontWeight: 700 }}>
                                HOJE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => startEdit(e)}
                          aria-label="Editar"
                          style={{ background: "var(--cream)", border: "1px solid var(--warm)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >✏️</button>
                        <button
                          onClick={() => setDeletingEntry(e)}
                          aria-label="Excluir"
                          style={{ background: "#fde8e8", border: "1px solid #f9caca", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >🗑️</button>
                      </div>
                    </div>

                    {/* Mini metrics */}
                    <div style={{ display: "flex", gap: 8, marginBottom: e.text ? 10 : 0 }}>
                      {[
                        { icon: "⚡", val: e.energy,     color: "#f59e0b", label: "Energia" },
                        { icon: "🌪️", val: e.anxiety,    color: "#ef4444", label: "Ansiedade" },
                        { icon: "🎯", val: e.motivation, color: "var(--blue-dark)", label: "Motivação" },
                      ].map(({ icon, val, color, label }) => (
                        <div key={label} style={{ flex: 1, background: "var(--cream)", borderRadius: 10, padding: "7px 8px", textAlign: "center", border: "1px solid var(--warm)" }}>
                          <div style={{ fontSize: 11 }}>{icon}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1.2, marginTop: 2 }}>{val ?? "—"}</div>
                          <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {e.text && (
                      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, fontStyle: "italic", borderTop: "1px solid var(--warm)", paddingTop: 10, marginTop: 2 }}>
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>

          {moodPoints.length < 2 ? (
            <div className="card" style={{ flex: 1 }}>
              <EmptyState icon="📊" message="Precisa de pelo menos 2 registos para ver o gráfico." />
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { label: "Registos", val: entries.length, icon: "📓" },
                  { label: "Humor médio", val: (entries.reduce((a, e) => a + (e.mood ?? 0), 0) / entries.length).toFixed(1), icon: "😊" },
                  { label: "Energia média", val: (entries.reduce((a, e) => a + (e.energy ?? 0), 0) / entries.length).toFixed(1), icon: "⚡" },
                  { label: "Motivação média", val: (entries.reduce((a, e) => a + (e.motivation ?? 0), 0) / entries.length).toFixed(1), icon: "🎯" },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="card" style={{ textAlign: "center", padding: "16px 12px" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 28, color: "var(--blue-dark)", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Mood chart */}
              <div className="card" style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, marginBottom: 4, color: "var(--blue-dark)" }}>Evolução do Humor</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>1 = Muito difícil · 5 = Ótimo</p>
                <MiniLineChart points={moodPoints} labels={moodLabels} height={160} color="var(--orange)" />
              </div>

              {/* Energy + Motivation charts side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 4, color: "#f59e0b" }}>⚡ Energia</h3>
                  <MiniLineChart
                    points={[...entries].slice(0, 14).reverse().map((e) => e.energy ?? 0)}
                    labels={[...entries].slice(0, 14).reverse().map((e) => new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))}
                    height={110}
                    color="#f59e0b"
                  />
                </div>
                <div className="card">
                  <h3 style={{ fontSize: 14, marginBottom: 4, color: "var(--blue-dark)" }}>🎯 Motivação</h3>
                  <MiniLineChart
                    points={[...entries].slice(0, 14).reverse().map((e) => e.motivation ?? 0)}
                    labels={[...entries].slice(0, 14).reverse().map((e) => new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))}
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
          <div className="delete-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="del-diary-title">
            <div className="delete-icon" aria-hidden="true" style={{ fontSize: 42, marginBottom: 16 }}>🗑️</div>
            <div id="del-diary-title" className="delete-title">Excluir registo?</div>
            <div className="delete-desc">Esta ação não pode ser desfeita.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setDeletingEntry(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}