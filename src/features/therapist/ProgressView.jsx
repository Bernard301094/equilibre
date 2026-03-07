import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { parseAnswers, matchAnswersToQuestions } from "../../utils/parsing";
import { isThisWeek } from "../../utils/dates";
import StatCard from "../../components/ui/StatCard";
import WeekGoalBar from "../../components/ui/WeekGoalBar";
import MiniLineChart from "../../components/ui/MiniLineChart";
import EmptyState from "../../components/ui/EmptyState";

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
      const rList  = Array.isArray(responses) ? responses : [];
      const goal   = Array.isArray(goals) && goals.length > 0 ? goals[0].weekly_target : null;

      // Build scale-point series
      const scalePts = rList
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

      const doneThisWeek = rList.filter((r) => isThisWeek(r.completed_at)).length;

      setChart({ scalePts, doneThisWeek, weeklyTarget: goal, totalDone: rList.length });
    })();
    return () => { active = false; };
  }, [selPat, session.access_token]);

  if (loading) return <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</p>;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>📈 Progresso dos Pacientes</h2>
        <p>Acompanhe a evolução das respostas ao longo do tempo</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelPat(p)}
            style={{ padding: "9px 16px", borderRadius: 10, border: `1.5px solid ${selPat?.id === p.id ? "var(--blue-dark)" : "var(--warm)"}`, background: selPat?.id === p.id ? "rgba(23,82,124,0.07)" : "var(--white)", cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontSize: 14, fontWeight: selPat?.id === p.id ? 600 : 500, color: selPat?.id === p.id ? "var(--blue-dark)" : "var(--text-muted)" }}
          >
            {p.name.split(" ")[0]}
          </button>
        ))}
        {patients.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Nenhum paciente ainda.</p>}
      </div>

      {selPat && chart && (
        <>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <StatCard icon="✅" value={chart.totalDone}    label="Exercícios concluídos" />
            <StatCard icon="📅" value={chart.doneThisWeek} label="Esta semana" />
            <StatCard icon="🎯" value={chart.weeklyTarget ?? "—"} label="Meta semanal" />
          </div>

          {chart.weeklyTarget && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>
                Meta semanal — {selPat.name.split(" ")[0]}
              </h3>
              <WeekGoalBar done={chart.doneThisWeek} target={chart.weeklyTarget} />
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Evolução das respostas de escala</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Média das escalas (0–10) por exercício respondido
            </p>
            {chart.scalePts.length >= 2 ? (
              <MiniLineChart
                points={chart.scalePts.map((p) => p.avg)}
                labels={chart.scalePts.map((p) => p.date)}
                height={100}
              />
            ) : (
              <EmptyState
                icon="📊"
                message="Aguardando respostas com escala para gerar gráfico."
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}