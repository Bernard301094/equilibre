import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { calcStreak, isThisWeek } from "../../utils/dates";
import StatCard from "../../components/ui/StatCard";
import WeekGoalBar from "../../components/ui/WeekGoalBar";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState from "../../components/ui/EmptyState";
import "./PatientProgress.css";

export default function PatientProgress({ session }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [responses, exercises, diary, goals] = await Promise.all([
          db.query("responses",     { filter: { patient_id: session.id }, order: "completed_at.asc" }, session.access_token),
          db.query("exercises",     {},                                                                  session.access_token),
          db.query("diary_entries", { filter: { patient_id: session.id }, order: "date.asc"         }, session.access_token),
          db.query("goals",         { filter: { patient_id: session.id }                             }, session.access_token),
        ]);
        if (!active) return;

        const exList = Array.isArray(exercises) ? exercises : [];
        const rList  = Array.isArray(responses) ? responses : [];
        const dList  = Array.isArray(diary)     ? diary     : [];
        const g      = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;

        const scalePts = rList
          .map((r) => {
            const ex   = exList.find((e) => e.id === r.exercise_id);
            const qs   = ex ? parseQuestions(ex) : [];
            const ans  = parseAnswers(r);
            const map  = matchAnswersToQuestions(qs, ans);
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

        const moodPts = dList.map((d) => ({
          date: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          val:  d.mood,
        }));

        const activeDates = [
          ...dList.map((e) => e.date),
          ...rList.map((r) => r.completed_at?.slice(0, 10)).filter(Boolean),
        ];

        const streak   = calcStreak(activeDates);
        const weekDone = rList.filter((r) => isThisWeek(r.completed_at)).length;

        setData({
          scalePts,
          moodPts,
          streak,
          total:       rList.length,
          diaryCount:  dList.length,
          weekDone,
          goal: g,
        });
      } catch (e) {
        console.error("[PatientProgress]", e);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  if (!data) return <p className="pp-loading">Carregando...</p>;

  const noCharts = data.scalePts.length < 2 && data.moodPts.length < 2;

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <h2>📊 Meu Progresso</h2>
        <p>Acompanhe sua evolução ao longo do tempo</p>
      </div>

      {/* Stats */}
      <div className="pp-stats-grid">
        <StatCard icon="🔥" value={data.streak}     label="Dias seguidos"       />
        <StatCard icon="✅" value={data.total}      label="Exercícios feitos"   />
        <StatCard icon="📓" value={data.diaryCount} label="Registros no diário" />
      </div>

      {/* Weekly goal */}
      {data.goal && (
        <div className="card pp-goal-card">
          <h3 className="pp-card-title">Meta desta semana</h3>
          <WeekGoalBar done={data.weekDone} target={data.goal.weekly_target} />
        </div>
      )}

      {/* Scale chart */}
      {data.scalePts.length >= 2 && (
        <div className="card pp-chart-card">
          <h3 className="pp-card-title">Evolução das respostas de escala</h3>
          <p className="pp-chart-desc">Média das escalas (0–10) por exercício</p>
          <MiniLineChart
            points={data.scalePts.map((p) => p.avg)}
            labels={data.scalePts.map((p) => p.date)}
            height={90}
          />
        </div>
      )}

      {/* Mood chart */}
      {data.moodPts.length >= 2 && (
        <div className="card pp-chart-card">
          <h3 className="pp-card-title">Histórico do humor</h3>
          <p className="pp-chart-desc">Do diário emocional (1 = difícil, 5 = ótimo)</p>
          <MiniLineChart
            points={data.moodPts.map((p) => p.val)}
            labels={data.moodPts.map((p) => p.date)}
            height={90}
            color="var(--orange)"
          />
        </div>
      )}

      {/* Empty state */}
      {noCharts && (
        <div className="card">
          <EmptyState
            icon="📈"
            message="Complete mais exercícios e registros no diário para ver seu progresso aqui."
          />
        </div>
      )}
    </div>
  );
}