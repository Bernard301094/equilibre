import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions, parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { isThisWeek } from "../../utils/dates";
import StatCard from "../../components/ui/StatCard";
import WeekGoalBar from "../../components/ui/WeekGoalBar";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState from "../../components/ui/EmptyState";
import "./TherapistProgress.css";

export default function TherapistProgress({ session }) {
  const [patients, setPatients] = useState([]);
  const [selPat,   setSelPat]   = useState(null);
  const [chart,    setChart]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    db.query(
      "users",
      { select: "id,name", filter: { therapist_id: session.id, role: "patient" } },
      session.access_token
    ).then((r) => {
      const p = Array.isArray(r) ? r : [];
      setPatients(p);
      if (p.length) setSelPat(p[0]);
      setLoading(false);
    });
  }, [session.id, session.access_token]);

  useEffect(() => {
    if (!selPat) return;
    let active = true;
    (async () => {
      const [responses, exercises, goals] = await Promise.all([
        db.query("responses", { filter: { patient_id: selPat.id }, order: "completed_at.asc" }, session.access_token),
        db.query("exercises", {}, session.access_token),
        db.query("goals",     { filter: { patient_id: selPat.id } }, session.access_token),
      ]);

      if (!active) return;

      const exList = Array.isArray(exercises) ? exercises : [];
      const rList  = Array.isArray(responses)  ? responses  : [];
      const goal   = Array.isArray(goals) && goals.length > 0 ? goals[0].weekly_target : null;

      // 1. Obtém os pontos brutos de cada exercício
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

      // 2. Agrupa por data para calcular a MÉDIA DIÁRIA (evita pontos amontoados)
      const groupedByDate = rawScalePts.reduce((acc, curr) => {
        if (!acc[curr.date]) acc[curr.date] = [];
        acc[curr.date].push(curr.avg);
        return acc;
      }, {});

      const scalePts = Object.keys(groupedByDate).map(date => {
        const vals = groupedByDate[date];
        const dailyAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { date, avg: Math.round(dailyAvg * 10) / 10 };
      });

      const doneThisWeek = rList.filter((r) => isThisWeek(r.completed_at)).length;
      setChart({ scalePts, doneThisWeek, weeklyTarget: goal, totalDone: rList.length });
    })();
    return () => { active = false; };
  }, [selPat, session.access_token]);

  if (loading) return <p className="tp-loading">Carregando...</p>;

  return (
    <div className="page-fade-in">

      <div className="page-header">
        <h2>📈 Progresso dos Pacientes</h2>
        <p>Acompanhe a evolução das respostas ao longo do tempo</p>
      </div>

      {/* ── Seletor de Paciente ── */}
      <div className="tp-patient-selector">
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelPat(p)}
            className={`tp-patient-btn${selPat?.id === p.id ? " tp-patient-btn--active" : ""}`}
          >
            {p.name.split(" ")[0]}
          </button>
        ))}
        {patients.length === 0 && (
          <p className="tp-no-patients">Nenhum paciente ainda.</p>
        )}
      </div>

      {/* ── Dashboard do Paciente Selecionado ── */}
      {selPat && chart && (
        <div className="tp-dashboard">

          {/* Grid de Estatísticas */}
          <div className="tp-stats-grid">
            <StatCard icon="✅" value={chart.totalDone}           label="Exercícios concluídos" />
            <StatCard icon="📅" value={chart.doneThisWeek}        label="Esta semana" />
            <StatCard icon="🎯" value={chart.weeklyTarget ?? "—"} label="Meta semanal" />
          </div>

          {/* Barra de meta semanal */}
          {chart.weeklyTarget && (
            <div className="card tp-goal-card">
              <h3 className="tp-card-title">
                Meta semanal — {selPat.name.split(" ")[0]}
              </h3>
              <WeekGoalBar done={chart.doneThisWeek} target={chart.weeklyTarget} />
            </div>
          )}

          {/* Gráfico de evolução em LARANJA */}
          <div className="card tp-chart-card">
            <h3 className="tp-card-title">Evolução das respostas de escala</h3>
            <p className="tp-chart-desc">
              Média diária das escalas (0–10) de exercícios concluídos
            </p>
            {chart.scalePts.length >= 2 ? (
              <MiniLineChart
                points={chart.scalePts.map((p) => p.avg)}
                labels={chart.scalePts.map((p) => p.date)}
                height={100}
                color="var(--pt-amber-500, #e8941a)" 
              />
            ) : (
              <EmptyState
                icon="📊"
                message="Aguardando respostas com escala para gerar gráfico."
              />
            )}
          </div>

        </div>
      )}
    </div>
  );
}