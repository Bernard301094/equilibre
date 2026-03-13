import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { calcStreak, isThisWeek } from "../../utils/dates";
import WeekGoalBar   from "../../components/ui/WeekGoalBar";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState    from "../../components/ui/EmptyState";
import "./PatientProgress.css";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

async function fetchExercisesByIds(ids, token) {
  if (!ids || ids.length === 0) return [];
  const list = ids.map(encodeURIComponent).join(",");
  const res = await fetch(`${SUPA_URL}/rest/v1/exercises?id=in.(${list})`, {
    cache: "no-store",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return [];
  return res.json();
}

function StatCard({ icon, value, label }) {
  return (
    <div className="pp-stat-card">
      <span className="pp-stat-card__icon" aria-hidden="true">{icon}</span>
      <span className="pp-stat-card__value" aria-label={`${value} ${label}`}>{value}</span>
      <span className="pp-stat-card__label">{label}</span>
    </div>
  );
}

export default function PatientProgress({ session }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [responses, diary, goals] = await Promise.all([
          db.query("responses",     { filter: { patient_id: session.id }, order: "completed_at.asc" }, session.access_token),
          db.query("diary_entries", { filter: { patient_id: session.id }, order: "date.asc"         }, session.access_token),
          db.query("goals",         { filter: { patient_id: session.id }                             }, session.access_token),
        ]);
        if (!active) return;

        const rList = Array.isArray(responses) ? responses : [];
        const dList = Array.isArray(diary)     ? diary     : [];
        const g     = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;

        // Busca exercises pelos IDs presentes nas respostas
        const ids = [...new Set(rList.map((r) => r.exercise_id).filter(Boolean))];
        const exList = await fetchExercisesByIds(ids, session.access_token);

        if (!active) return;

        const rawScalePts = rList
          .map((r) => {
            const ex  = exList.find((e) => e.id === r.exercise_id);
            const qs  = ex ? parseQuestions(ex) : [];
            const ans = parseAnswers(r);
            const map = matchAnswersToQuestions(qs, ans);
            const vals = qs
              .filter((q) => q.type === "scale" && map[q.id] !== "")
              .map((q) => Number(map[q.id]))
              .filter((v) => !isNaN(v));
            if (!vals.length) return null;
            const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
            return {
              date: new Date(r.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
              avg,
            };
          })
          .filter(Boolean);

        const groupedByDate = rawScalePts.reduce((acc, curr) => {
          if (!acc[curr.date]) acc[curr.date] = [];
          acc[curr.date].push(curr.avg);
          return acc;
        }, {});

        const scalePts = Object.keys(groupedByDate).map((date) => {
          const vals = groupedByDate[date];
          return { date, avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 };
        });

        const moodPts = dList.map((d) => ({
          date: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          val:  d.mood,
        }));

        const activeDates = [
          ...dList.map((e) => e.date),
          ...rList.map((r) => r.completed_at?.slice(0, 10)).filter(Boolean),
        ];

        setData({
          scalePts,
          moodPts,
          streak:     calcStreak(activeDates),
          total:      rList.length,
          diaryCount: dList.length,
          weekDone:   rList.filter((r) => isThisWeek(r.completed_at)).length,
          goal: g,
        });
      } catch (e) {
        console.error("[PatientProgress]", e);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  if (!data) {
    return (
      <div className="pp-loading" aria-live="polite">
        <span className="pp-loading__icon" aria-hidden="true">📊</span>
        <p>Carregando progresso…</p>
      </div>
    );
  }

  const hasScale    = data.scalePts.length >= 2;
  const hasMood     = data.moodPts.length  >= 2;
  const noCharts    = !hasScale && !hasMood;
  const onlyOneChart = hasScale !== hasMood;

  return (
    <div className="pp-page page-fade-in">
      <header className="pp-header">
        <h2 className="pp-header__title">📊 Meu Progresso</h2>
        <p className="pp-header__sub">Acompanhe sua evolução ao longo do tempo</p>
      </header>

      <div className="pp-stats-grid" role="list" aria-label="Estatísticas gerais">
        <StatCard icon="🔥" value={data.streak}     label="Dias seguidos"       />
        <StatCard icon="✅"    value={data.total}      label="Exercícios feitos"   />
        <StatCard icon="📓" value={data.diaryCount} label="Registros no diário" />
      </div>

      {data.goal && (
        <div className="pp-goal-card">
          <h3 className="pp-section-title">🎯 Meta desta semana</h3>
          <WeekGoalBar done={data.weekDone} target={data.goal.weekly_target} />
        </div>
      )}

      {!noCharts && (
        <div className="pp-charts-grid">
          {hasScale && (
            <div className={`pp-chart-card pp-chart-card--scale${onlyOneChart ? " pp-chart-card--full" : ""}`}>
              <h3 className="pp-section-title">📈 Escalas dos Exercícios</h3>
              <p className="pp-section-desc">Média diária das escalas (0–10) de exercícios concluídos</p>
              <div className="pp-chart-card__inner">
                <MiniLineChart
                  points={data.scalePts.map((p) => p.avg)}
                  labels={data.scalePts.map((p) => p.date)}
                  height={110}
                  color="var(--pt-blue-500, #2e7fab)"
                />
              </div>
            </div>
          )}
          {hasMood && (
            <div className={`pp-chart-card pp-chart-card--mood${onlyOneChart ? " pp-chart-card--full" : ""}`}>
              <h3 className="pp-section-title">😊 Histórico do Humor</h3>
              <p className="pp-section-desc">Do diário emocional (1 = difícil · 5 = ótimo)</p>
              <div className="pp-chart-card__inner">
                <MiniLineChart
                  points={data.moodPts.map((p) => p.val)}
                  labels={data.moodPts.map((p) => p.date)}
                  height={110}
                  color="var(--pt-amber-500, #e8941a)"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {noCharts && (
        <div className="pp-empty">
          <EmptyState
            icon="📈"
            message="Complete mais exercícios e registros no diário para ver seu progresso aqui."
          />
        </div>
      )}
    </div>
  );
}
