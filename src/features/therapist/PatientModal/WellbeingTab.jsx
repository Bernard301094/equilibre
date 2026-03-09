import { useMemo } from "react";
import { MOOD_OPTIONS, resolveMood } from "../../../utils/constants";
import { isThisWeek } from "../../../utils/dates";
import WeekGoalBar from "../../../components/ui/WeekGoalBar";
import MiniLineChart from "../../../components/ui/MiniLineChart";
import EmptyState from "../../../components/ui/EmptyState";
import "./WellbeingTab.css";

/* ─── Estatísticas de resumo ─────────────────────────────────────────────── */
const SUMMARY_STATS = (avgFn, total) => [
  { icon: "📓", label: "Registos",      val: total,               colorClass: "wellbeing-tab__stat-val--blue"   },
  { icon: "😊", label: "Humor médio",   val: avgFn("mood"),        colorClass: "wellbeing-tab__stat-val--orange" },
  { icon: "⚡", label: "Energia média", val: avgFn("energy"),      colorClass: "wellbeing-tab__stat-val--yellow" },
  { icon: "🎯", label: "Motivação",     val: avgFn("motivation"),  colorClass: "wellbeing-tab__stat-val--blue"   },
];

const ENTRY_METRICS = [
  { key: "energy",     icon: "⚡",  label: "Energia",   colorClass: "wellbeing-tab__metric-val--yellow" },
  { key: "anxiety",    icon: "🌪️", label: "Ansiedade", colorClass: "wellbeing-tab__metric-val--red"    },
  { key: "motivation", icon: "🎯", label: "Motivação", colorClass: "wellbeing-tab__metric-val--blue"   },
];

/* ─── Agrupamento para distribuição de humores ───────────────────────────────
   MOOD_OPTIONS tem 10 entradas, algumas com val repetido.
   Agrupamos por `id` (único) para mostrar cada humor individualmente,
   ordenados do mais difícil para o mais positivo (pela ordem do array).     */
function buildMoodCounts(diaryEntries) {
  return MOOD_OPTIONS.map((m) => ({
    ...m,
    // Conta entradas onde mood_id bate exatamente OU, para registros legados
    // sem mood_id, o val numérico coincide e não há outro humor mais específico.
    count: diaryEntries.filter((e) => {
      if (e.mood_id) return e.mood_id === m.id;
      // Legado: sem mood_id — atribui ao primeiro MOOD_OPTIONS com aquele val
      const fallback = MOOD_OPTIONS.find((x) => x.val === e.mood);
      return fallback?.id === m.id;
    }).length,
  }));
}

export default function WellbeingTab({ diaryEntries = [], goal, assignments = [] }) {

  /* ── Dados derivados ── */
  const weekDone = useMemo(
    () => assignments.filter(
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
      day: "2-digit", month: "2-digit",
    })
  );

  const avg = (key) => {
    const vals = diaryEntries.map((e) => e[key]).filter((v) => v != null);
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  /* Contagem por humor (10 humores expandidos, com suporte a legado) */
  const moodCounts = useMemo(() => buildMoodCounts(diaryEntries), [diaryEntries]);
  const maxCount   = Math.max(...moodCounts.map((m) => m.count), 1);

  /* ── Empty state ── */
  if (diaryEntries.length === 0) {
    return (
      <div className="wellbeing-tab__empty-wrap">
        <EmptyState
          icon="📊"
          message="O paciente ainda não tem registos no diário."
          sub="Os dados de bem-estar aparecerão aqui quando ele começar a registar."
        />
      </div>
    );
  }

  const summaryStats = SUMMARY_STATS(avg, diaryEntries.length);

  return (
    <div className="wellbeing-tab">

      {/* ── Progresso semanal ── */}
      {goal?.weekly_target > 0 && (
        <div className="wellbeing-tab__card">
          <h4 className="wellbeing-tab__section-title">Progresso desta semana</h4>
          <WeekGoalBar done={weekDone} target={goal.weekly_target} />
        </div>
      )}

      {/* ── Estatísticas de resumo ── */}
      <div className="wellbeing-tab__summary-grid">
        {summaryStats.map(({ icon, label, val, colorClass }) => (
          <div key={label} className="wellbeing-tab__summary-stat">
            <span className="wellbeing-tab__summary-icon" aria-hidden="true">{icon}</span>
            <span className={`wellbeing-tab__summary-val ${colorClass}`}>
              {val ?? "—"}
            </span>
            <span className="wellbeing-tab__summary-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Distribuição de humores ────────────────────────────────────────────
          Usa MOOD_OPTIONS (10 humores) como fonte de dados visual.
          Humores sem registos (count=0) ficam ocultos para não poluir a UI. */}
      <div className="wellbeing-tab__card">
        <h4 className="wellbeing-tab__section-title">Distribuição de humores</h4>
        <div className="wellbeing-tab__mood-bars">
          {moodCounts
            .filter((m) => m.count > 0) // oculta humores sem registos
            .map((m) => {
              const pct = (m.count / maxCount) * 100;
              const barClass =
                m.val <= 2 ? "wellbeing-tab__mood-fill--low"
                : m.val === 3 ? "wellbeing-tab__mood-fill--mid"
                : "wellbeing-tab__mood-fill--high";
              return (
                <div key={m.id} className="wellbeing-tab__mood-row">
                  {/* Emoji do humor vindo de MOOD_OPTIONS */}
                  <span
                    className="wellbeing-tab__mood-emoji"
                    aria-hidden="true"
                    title={m.label}
                  >
                    {m.emoji}
                  </span>

                  {/* Label do humor — mostra o nome completo (ex: "Frustrado") */}
                  <span className="wellbeing-tab__mood-label-text">
                    {m.label}
                  </span>

                  <div
                    className="wellbeing-tab__mood-track"
                    role="progressbar"
                    aria-valuenow={m.count}
                    aria-valuemax={maxCount}
                    aria-label={`${m.label}: ${m.count} registos`}
                  >
                    <div
                      className={`wellbeing-tab__mood-fill ${barClass}`}
                      style={{
                        width: `${pct}%`,
                        /* Cor semântica da barra vinda de MOOD_OPTIONS.color */
                        background: m.color,
                        opacity: 0.85,
                      }}
                    />
                  </div>

                  <span className="wellbeing-tab__mood-count">{m.count}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* ── Gráfico de evolução ── */}
      {moodPoints.length >= 2 && (
        <div className="wellbeing-tab__card">
          <h4 className="wellbeing-tab__section-title">
            Evolução do humor (últimos 14 dias)
          </h4>
          <p className="wellbeing-tab__chart-legend">
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

      {/* ── Registos recentes ──────────────────────────────────────────────────
          `resolveMood(e.mood_id, e.mood)` garante que registos gravados com
          o novo campo `mood_id` mostrem o emoji/label correto (ex: "Frustrado"
          em vez de "Esgotado" mesmo ambos tendo val=2), e que registos legados
          sem `mood_id` também funcionem via fallback pelo val numérico.       */}
      <div className="wellbeing-tab__recent">
        <h4 className="wellbeing-tab__section-title">Registos recentes</h4>
        <div className="wellbeing-tab__entry-list">
          {diaryEntries.slice(0, 7).map((e) => {
            const m = resolveMood(e.mood_id, e.mood);
            return (
              <div key={e.id} className="wellbeing-tab__entry-row">

                {/* Emoji com cor de fundo semântica baseada em m.color */}
                <span
                  className="wellbeing-tab__entry-emoji"
                  aria-hidden="true"
                  style={{ background: m?.color ? `${m.color}18` : undefined }}
                >
                  {m?.emoji ?? "😐"}
                </span>

                <div className="wellbeing-tab__entry-info">
                  <div className="wellbeing-tab__entry-mood">
                    {m?.label ?? "—"}
                  </div>
                  <div className="wellbeing-tab__entry-date">
                    {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "short", day: "2-digit", month: "short",
                    })}
                  </div>
                </div>

                <div className="wellbeing-tab__entry-metrics">
                  {ENTRY_METRICS.map(({ key, icon, label, colorClass }) => (
                    <div key={key} className="wellbeing-tab__metric-chip">
                      <span className="wellbeing-tab__metric-icon" aria-hidden="true">
                        {icon}
                      </span>
                      <span
                        className={`wellbeing-tab__metric-val ${colorClass}`}
                        aria-label={`${label}: ${e[key] ?? "sem dados"}`}
                      >
                        {e[key] ?? "—"}
                      </span>
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