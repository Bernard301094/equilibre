import { useMemo } from "react";
import { MOODS } from "../../../utils/constants";
import { isThisWeek } from "../../../utils/dates";
import WeekGoalBar from "../../../components/ui/WeekGoalBar";
import MiniLineChart from "../../../components/ui/MiniLineChart";
import EmptyState from "../../../components/ui/EmptyState";

/**
 * WellbeingTab — shown inside PatientModal.
 *
 * Props:
 *   diaryEntries  — array of diary rows fetched WITHOUT the "text" field (privacy)
 *                   fields: id, date, mood, energy, anxiety, motivation
 *   goal          — goals row { weekly_target } or null
 *   assignments   — all assignment rows for the patient (to compute weekDone)
 */
export default function WellbeingTab({ diaryEntries = [], goal, assignments = [] }) {
  // ── Derived data ──────────────────────────────────────────────────────────

  const weekDone = useMemo(
    () =>
      assignments.filter(
        (a) => a.status === "done" && a.updated_at && isThisWeek(a.updated_at)
      ).length,
    [assignments]
  );

  const chartEntries = useMemo(
    () => [...diaryEntries].slice(0, 14).reverse(),
    [diaryEntries]
  );

  const moodPoints = chartEntries.map((e) => e.mood ?? 0);
  const moodLabels = chartEntries.map((e) =>
    new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })
  );

  const avg = (key) => {
    const vals = diaryEntries.map((e) => e[key]).filter((v) => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (diaryEntries.length === 0) {
    return (
      <div style={{ padding: "24px 0" }}>
        <EmptyState
          icon="📊"
          message="O paciente ainda não tem registos no diário."
          sub="Os dados de bem-estar aparecerão aqui quando ele começar a registar."
        />
      </div>
    );
  }

  // ── Mood distribution ─────────────────────────────────────────────────────

  const moodCounts = MOODS.map((m) => ({
    ...m,
    count: diaryEntries.filter((e) => e.mood === m.val).length,
  }));
  const maxCount = Math.max(...moodCounts.map((m) => m.count), 1);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Weekly goal bar ── */}
      {goal?.weekly_target > 0 && (
        <div
          style={{
            background: "var(--cream)",
            border: "1px solid var(--warm)",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <h4
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--text-muted)",
              marginBottom: 12,
            }}
          >
            Progresso desta semana
          </h4>
          <WeekGoalBar done={weekDone} target={goal.weekly_target} />
        </div>
      )}

      {/* ── Summary stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { icon: "📓", label: "Registos", val: diaryEntries.length, color: "var(--blue-dark)" },
          { icon: "😊", label: "Humor médio", val: avg("mood"), color: "var(--orange)" },
          { icon: "⚡", label: "Energia média", val: avg("energy"), color: "#f59e0b" },
          { icon: "🎯", label: "Motivação", val: avg("motivation"), color: "var(--blue-dark)" },
        ].map(({ icon, label, val, color }) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              background: "var(--cream)",
              borderRadius: 12,
              padding: "14px 8px",
              border: "1px solid var(--warm)",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: 24,
                color,
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              {val ?? "—"}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                marginTop: 5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Mood distribution bar chart ── */}
      <div
        style={{
          background: "var(--cream)",
          border: "1px solid var(--warm)",
          borderRadius: 14,
          padding: "16px 18px",
        }}
      >
        <h4
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--text-muted)",
            marginBottom: 14,
          }}
        >
          Distribuição de humores
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {moodCounts.map((m) => (
            <div key={m.val} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                {m.emoji}
              </span>
              <div style={{ flex: 1, background: "var(--warm)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${(m.count / maxCount) * 100}%`,
                    background: m.val <= 2
                      ? "var(--danger)"
                      : m.val === 3
                      ? "var(--accent)"
                      : "var(--sage-dark)",
                    borderRadius: 6,
                    transition: "width .4s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  width: 24,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {m.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mood evolution chart ── */}
      {moodPoints.length >= 2 && (
        <div
          style={{
            background: "var(--cream)",
            border: "1px solid var(--warm)",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <h4
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".06em",
              color: "var(--text-muted)",
              marginBottom: 4,
            }}
          >
            Evolução do humor (últimos 14 dias)
          </h4>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>
            1 = Muito difícil · 5 = Ótimo
          </p>
          <MiniLineChart
            points={moodPoints}
            labels={moodLabels}
            height={120}
            color="var(--orange)"
          />
        </div>
      )}

      {/* ── Recent entries list (no text shown) ── */}
      <div>
        <h4
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".06em",
            color: "var(--text-muted)",
            marginBottom: 10,
          }}
        >
          Registos recentes
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {diaryEntries.slice(0, 7).map((e) => {
            const m = MOODS.find((x) => x.val === e.mood);
            return (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "var(--cream)",
                  borderRadius: 10,
                  border: "1px solid var(--warm)",
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{m?.emoji ?? "😐"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {m?.label ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { icon: "⚡", val: e.energy,     color: "#f59e0b", label: "Energia" },
                    { icon: "🌪️", val: e.anxiety,    color: "#ef4444", label: "Ansiedade" },
                    { icon: "🎯", val: e.motivation, color: "var(--blue-dark)", label: "Motivação" },
                  ].map(({ icon, val, color, label }) => (
                    <div
                      key={label}
                      style={{
                        textAlign: "center",
                        background: "white",
                        borderRadius: 8,
                        padding: "4px 8px",
                        border: "1px solid var(--warm)",
                        minWidth: 36,
                      }}
                    >
                      <div style={{ fontSize: 10 }}>{icon}</div>
                      <div style={{ fontWeight: 700, color, fontSize: 13, lineHeight: 1.2 }}>
                        {val ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}