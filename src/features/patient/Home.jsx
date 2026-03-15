import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { calcStreak, localDateOffset, isThisWeek } from "../../utils/dates";
import { getPlantStage, LS_LAST_ACTION } from "../../utils/constants";
import StatCard from "../../components/ui/StatCard";
import WeekGoalBar from "../../components/ui/WeekGoalBar";
import OnboardingTour from "../../components/ui/OnboardingTour";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { validateInviteCode } from "../../utils/validation";
import "./Home.css";
import "../../styles/micro-interactions.css";

const LS_ADMIN_BACKUP = "eq_admin_session_backup";

const getGreeting = (name) => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return `Bom dia, ${name} ☀️`;
  if (h >= 12 && h < 18) return `Boa tarde, ${name} 🌤️`;
  if (h >= 18 && h < 22) return `Boa noite, ${name} 🌙`;
  return `Olá, ${name} 🌙`;
};

const getGreetingSub = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Como você acordou hoje? Reserve um momento para si.";
  if (h >= 12 && h < 18) return "Como está sendo o seu dia até agora?";
  if (h >= 18 && h < 22) return "Como foi o seu dia? Já registou como está se sentindo?";
  return "Ainda acordado? Cuide-se — o descanso também é parte do processo.";
};

export default function PatientHome({ session, setSession, setView }) {
  const [data, setData] = useState({
    pending: 0, done: 0, streak: 0, goal: null,
    weekDone: 0, overdue: 0, hasActivityToday: false, isLate: false,
  });
  const [loading,    setLoading]    = useState(true);
  const [showWater,  setShowWater]  = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [linking,    setLinking]    = useState(false);
  const [linkMsg,    setLinkMsg]    = useState({ type: "", text: "" });
  const inflightRef = useRef(false);

  const isImpersonating = !!localStorage.getItem(LS_ADMIN_BACKUP);

  const [prevStreak,    setPrevStreak]    = useState(null);
  const [prevWeekDone,  setPrevWeekDone]  = useState(null);
  const [plantPulse,    setPlantPulse]    = useState(false);
  const [streakLevelUp, setStreakLevelUp] = useState(false);
  const [goalReached,   setGoalReached]   = useState(false);

  const { supported, permission, subscribed, subscribe } =
    usePushNotifications({ session, setView });

  useEffect(() => {
    if (supported && permission === "default" && !subscribed) {
      const t = setTimeout(() => subscribe(), 4000);
      return () => clearTimeout(t);
    }
  }, [supported, permission, subscribed, subscribe]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const [pendRows, doneRows, goals, responses, diary] = await Promise.all([
          db.query("assignments",   { filter: { patient_id: session.id, status: "pending" }, select: "id,due_date" }, session.access_token),
          db.query("assignments",   { filter: { patient_id: session.id, status: "done"    }, select: "id"         }, session.access_token),
          db.query("goals",         { filter: { patient_id: session.id }, select: "weekly_target"                  }, session.access_token),
          db.query("responses",     { filter: { patient_id: session.id }, order: "completed_at.desc", select: "id,completed_at" }, session.access_token),
          db.query("diary_entries", { filter: { patient_id: session.id }, order: "date.desc", select: "id,date"    }, session.access_token),
        ]);
        if (!active) return;

        const now      = new Date();
        const hour     = now.getHours();
        const pendList = Array.isArray(pendRows)  ? pendRows  : [];
        const respList = Array.isArray(responses) ? responses : [];
        const dList    = Array.isArray(diary)     ? diary     : [];

        const activeDates = [
          ...dList.map((e) => e.date),
          ...respList.map((r) => r.completed_at?.slice(0, 10)).filter(Boolean),
        ];
        const streak   = calcStreak(activeDates);
        const today    = localDateOffset(0);
        const hasToday = activeDates.includes(today);
        const weekDone = respList.filter((r) => isThisWeek(r.completed_at)).length;
        const overdue  = pendList.filter((a) => {
          if (!a.due_date) return false;
          return new Date(a.due_date) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }).length;

        const lastAction = localStorage.getItem(LS_LAST_ACTION);
        if (lastAction && Date.now() - parseInt(lastAction, 10) < 5000) {
          setShowWater(true);
          localStorage.removeItem(LS_LAST_ACTION);
          setTimeout(() => setShowWater(false), 2000);
        }

        setData({
          pending:          pendList.length,
          done:             Array.isArray(doneRows) ? doneRows.length : 0,
          streak,
          goal:             Array.isArray(goals) && goals.length > 0 ? goals[0] : null,
          weekDone,
          overdue,
          hasActivityToday: hasToday,
          isLate:           hour >= 19,
        });
      } catch (e) {
        console.error("[PatientHome]", e);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => { active = false; clearInterval(id); };
  }, [session.id, session.access_token]);

  useEffect(() => {
    if (loading) return;
    if (prevStreak === null) {
      setPrevStreak(data.streak);
      setPrevWeekDone(data.weekDone);
      return;
    }
    if (data.streak > prevStreak) {
      setPlantPulse(true);
      setStreakLevelUp(true);
      setTimeout(() => setPlantPulse(false),    800);
      setTimeout(() => setStreakLevelUp(false),  950);
    }
    const target = data.goal?.weekly_target;
    if (target && prevWeekDone < target && data.weekDone >= target) {
      setGoalReached(true);
      setTimeout(() => setGoalReached(false), 750);
    }
    setPrevStreak(data.streak);
    setPrevWeekDone(data.weekDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.streak, data.weekDone, loading]);

  const handleLink = async () => {
    if (inflightRef.current || linking) return;
    const codeErr = validateInviteCode(inviteCode);
    if (codeErr) { setLinkMsg({ type: "error", text: codeErr }); return; }
    inflightRef.current = true;
    setLinking(true);
    setLinkMsg({ type: "", text: "" });
    try {
      const code    = inviteCode.trim().toUpperCase();
      const invites = await db.query("invites", { filter: { code } });
      if (!Array.isArray(invites) || invites.length === 0)
        throw new Error("Código não encontrado.");
      const invite = invites[0];
      if (invite.status !== "pending")
        throw new Error("Este código já foi utilizado ou expirou.");
      await db.update("users",   { id: session.id }, { therapist_id: invite.therapist_id }, session.access_token);
      await db.update("invites", { code }, { status: "used", used_by: session.id, used_at: new Date().toISOString() }, session.access_token);
      setSession((prev) => ({ ...prev, therapist_id: invite.therapist_id }));
      setLinkMsg({ type: "success", text: "Profissional vinculado com sucesso! ✅" });
      setInviteCode("");
    } catch (e) {
      setLinkMsg({ type: "error", text: e.message });
    } finally {
      setLinking(false);
      inflightRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="patient-home-loading">
        <span className="patient-home-loading__icon" aria-hidden="true">✨</span>
        <p className="patient-home-loading__title">Respire fundo...</p>
        <p className="patient-home-loading__sub">Preparando o seu espaço de cuidado.</p>
      </div>
    );
  }

  const stage     = getPlantStage(data.streak);
  const firstName = session.name.split(" ")[0];

  return (
    <>
      <OnboardingTour />

      <div className="patient-home page-fade-in">

        {/* ── Header ── */}
        <header className="patient-home__header">
          <h2 className="patient-home__greeting">{getGreeting(firstName)}</h2>
          <p className="patient-home__greeting-sub">{getGreetingSub()}</p>
        </header>

        {/* ── Vincular profissional ── */}
        {!session.therapist_id && !isImpersonating && (
          <div className="patient-home__link-card">
            <span className="patient-home__link-icon" aria-hidden="true">🤝</span>
            <div className="patient-home__link-body">
              <h3 className="patient-home__link-title">Vincular profissional</h3>
              <p className="patient-home__link-desc">
                Digite o código de convite enviado pela sua psicóloga:
              </p>
              <div className="patient-home__link-row">
                <label htmlFor="link-invite-input" className="sr-only">Código de convite</label>
                <input
                  id="link-invite-input"
                  className="patient-home__invite-input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ex: AB3X9K"
                  maxLength={10}
                  autoComplete="off"
                  onKeyDown={(e) => e.key === "Enter" && handleLink()}
                />
                <button
                  className="patient-home__link-btn"
                  onClick={handleLink}
                  disabled={linking}
                  aria-busy={linking}
                >
                  {linking ? "Vinculando..." : "Vincular"}
                </button>
              </div>
              {linkMsg.text && (
                <p
                  role="alert"
                  className={[
                    "patient-home__link-msg",
                    `patient-home__link-msg--${linkMsg.type}`,
                  ].join(" ")}
                >
                  {linkMsg.text}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="patient-home__stats-grid">
          <div className={[
            "patient-home__plant-card",
            streakLevelUp ? "streak-levelup" : "",
          ].filter(Boolean).join(" ")}>
            {showWater && (
              <span className="patient-home__water-drop" aria-hidden="true">💧</span>
            )}
            <div className="patient-home__plant-emoji-wrap">
              <span
                className={[
                  "patient-home__plant-emoji",
                  plantPulse ? "plant-pulse" : "",
                ].filter(Boolean).join(" ")}
                role="img"
                aria-label={`Planta: ${stage.label}`}
              >
                {stage.icon}
              </span>
            </div>
            <div className="patient-home__plant-data">
              <span className="patient-home__streak-val" style={{ color: stage.color }}>
                {data.streak}
              </span>
              <span className="patient-home__streak-label">Dias seguidos</span>
            </div>
          </div>

          <StatCard icon="⏳" value={data.pending} label="Para fazer" />

          {data.overdue > 0 ? (
            <StatCard
              icon="⚠️"
              value={data.overdue}
              label="Com prazo vencido"
              accent="var(--accent)"
              className="patient-home__stat--overdue"
            />
          ) : (
            <StatCard icon="✅" value={data.done} label="Concluídos" />
          )}
        </div>

        {/* ── Aviso de streak ── */}
        {!data.hasActivityToday && data.streak > 0 && (
          <div
            className={[
              "patient-home__streak-warn",
              data.isLate ? "patient-home__streak-warn--late" : "",
            ].filter(Boolean).join(" ")}
            role="alert"
          >
            <span className="patient-home__streak-warn-icon" aria-hidden="true">
              {data.isLate ? "⚠️" : "🪺"}
            </span>
            <div className="patient-home__streak-warn-body">
              <h3 className={[
                "patient-home__streak-warn-title",
                data.isLate ? "patient-home__streak-warn-title--late" : "",
              ].filter(Boolean).join(" ")}>
                {data.isLate ? "Sua planta está com sede!" : "Não se esqueça de regar!"}
              </h3>
              <p className="patient-home__streak-warn-desc">
                Registe algo hoje para manter a sequência de{" "}
                <strong>{data.streak} dia{data.streak > 1 ? "s" : ""}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ── Meta semanal ── */}
        {data.goal && (
          <div className={[
            "patient-home__goal-card",
            goalReached ? "goal-reached" : "",
          ].filter(Boolean).join(" ")}>
            <WeekGoalBar done={data.weekDone} target={data.goal.weekly_target} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            CTA principal
            Regra corrigida:
            1. Exercícios pendentes → sempre mostra o banner (independente de hasActivityToday)
            2. Sem atividade hoje + sem pendentes → mostra CTA do diário
            3. Tudo em dia → mensagem de parabenização
        ══════════════════════════════════════════════════════ */}
        {data.pending > 0 ? (
          <div
            className="patient-home__cta patient-home__cta--exercises"
            onClick={() => setView("exercises")}
            role="button"
            tabIndex={0}
            aria-label="Ir para meus exercícios"
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setView("exercises")}
          >
            <div className="patient-home__cta-body">
              <div className="patient-home__cta-text">
                <span className="patient-home__cta-ex-icon" aria-hidden="true">📋</span>
                <h3 className="patient-home__cta-title">
                  Você tem {data.pending} exercício{data.pending > 1 ? "s" : ""} pendente{data.pending > 1 ? "s" : ""}!
                </h3>
                <p className="patient-home__cta-desc">
                  Clique aqui para começar quando estiver pronto(a).
                </p>
              </div>
            </div>
          </div>

        ) : !data.hasActivityToday ? (
          <div
            className="patient-home__cta patient-home__cta--diary"
            onClick={() => setView("diary")}
            role="button"
            tabIndex={0}
            aria-label="Ir para o diário emocional"
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setView("diary")}
          >
            <div className="patient-home__cta-body">
              <div className="patient-home__cta-text">
                <h3 className="patient-home__cta-title">Vamos regar agora?</h3>
                <p className="patient-home__cta-desc">
                  Registe como você está hoje no diário e mantenha seu jardim vivo.
                </p>
              </div>
              <span className="patient-home__cta-icon" aria-hidden="true">🛃</span>
            </div>
          </div>

        ) : (
          <div className="patient-home__all-done">
            <span className="patient-home__all-done-icon" aria-hidden="true">🎉</span>
            <p className="patient-home__all-done-text">
              Você está em dia com o seu cuidado hoje!
            </p>
          </div>
        )}

      </div>
    </>
  );
}
