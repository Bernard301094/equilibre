import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { calcStreak, localDateOffset, isThisWeek } from "../../utils/dates";
import { getPlantStage, LS_LAST_ACTION } from "../../utils/constants";
import StatCard from "../../components/ui/StatCard";
import WeekGoalBar from "../../components/ui/WeekGoalBar";
import { validateInviteCode } from "../../utils/validation";

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
    pending:          0,
    done:             0,
    streak:           0,
    goal:             null,
    weekDone:         0,
    overdue:          0,
    hasActivityToday: false,
    isLate:           false,
  });
  const [loading,    setLoading]    = useState(true);
  const [showWater,  setShowWater]  = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [linking,    setLinking]    = useState(false);
  const [linkMsg,    setLinkMsg]    = useState({ type: "", text: "" });
  const inflightRef = useRef(false);

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
        const pendList = Array.isArray(pendRows) ? pendRows : [];
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

  // ── Link therapist ────────────────────────────────────────────────────────
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
      <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">✨</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--blue-dark)", marginBottom: 4 }}>
          Respire fundo...
        </div>
        <div style={{ fontSize: 14 }}>Preparando o seu espaço de cuidado.</div>
      </div>
    );
  }

  const stage     = getPlantStage(data.streak);
  const firstName = session.name.split(" ")[0];

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>

      {/* ── Header ── */}
      <div className="page-header">
        <h2>{getGreeting(firstName)}</h2>
        <p>{getGreetingSub()}</p>
      </div>

      {/* ── Link therapist ── */}
      {!session.therapist_id && (
        <div className="card" style={{ marginBottom: 20, borderLeft: "4px solid var(--blue-mid)" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 26, marginTop: 2 }} aria-hidden="true">🤝</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Vincular profissional</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
                Digite o código de convite enviado pela sua psicóloga:
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <label htmlFor="link-invite-input" className="sr-only">Código de convite</label>
                <input
                  id="link-invite-input"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ex: AB3X9K"
                  maxLength={10}
                  autoComplete="off"
                  style={{
                    flex: 1, minWidth: 140,
                    padding: "10px 14px",
                    border: "1.5px solid var(--warm)",
                    borderRadius: 10,
                    fontFamily: "monospace", fontSize: 16, letterSpacing: ".1em",
                    background: "var(--cream)", outline: "none", color: "var(--text)",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLink()}
                />
                <button
                  className="btn btn-sage"
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
                  style={{
                    marginTop: 10, fontSize: 13, fontWeight: 600,
                    color: linkMsg.type === "error" ? "var(--danger)" : "#1a5c28",
                  }}
                >
                  {linkMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ position: "relative", overflow: "hidden" }}>
          {showWater && (
            <div className="water-drop" aria-hidden="true">💧</div>
          )}
          <div
            className="plant-animation"
            style={{ fontSize: 44, marginBottom: 8, marginTop: 4 }}
            aria-label={`Planta: ${stage.label}`}
          >
            {stage.icon}
          </div>
          <div className="stat-val" style={{ color: stage.color }}>{data.streak}</div>
          <div className="stat-label">Dias seguidos</div>
        </div>

        <StatCard icon="⏳" value={data.pending} label="Para fazer" />

        {data.overdue > 0 ? (
          <StatCard
            icon="⚠️"
            value={data.overdue}
            label="Com prazo vencido"
            accent="var(--accent)"
            style={{ border: "1.5px solid var(--accent)" }}
          />
        ) : (
          <StatCard icon="✅" value={data.done} label="Concluídos" />
        )}
      </div>

      {/* ── Streak warning ── */}
      {!data.hasActivityToday && data.streak > 0 && (
        <div
          className="card"
          role="alert"
          style={{
            marginBottom: 20,
            borderLeft: `4px solid ${data.isLate ? "var(--danger)" : "var(--accent)"}`,
            background: data.isLate ? "var(--danger-soft)" : "var(--accent-soft)",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ fontSize: 28 }} aria-hidden="true">
              {data.isLate ? "⚠️" : "🪴"}
            </div>
            <div>
              <h3 style={{
                fontSize: 15, marginBottom: 4,
                color: data.isLate ? "var(--danger)" : "var(--orange)",
              }}>
                {data.isLate ? "Sua planta está com sede!" : "Não se esqueça de regar!"}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.4 }}>
                Registe algo hoje para manter a sequência de{" "}
                <strong style={{ color: "var(--text)" }}>
                  {data.streak} dia{data.streak > 1 ? "s" : ""}
                </strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Weekly goal ── */}
      {data.goal && (
        <div className="card" style={{ marginBottom: 20 }}>
          <WeekGoalBar done={data.weekDone} target={data.goal.weekly_target} />
        </div>
      )}

      {/* ── Primary CTA ── */}
      {!data.hasActivityToday ? (
        <div
          className="card cta-banner cta-green"
          style={{ cursor: "pointer" }}
          onClick={() => setView("diary")}
          role="button"
          tabIndex={0}
          aria-label="Ir para o diário emocional"
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setView("diary")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 17, marginBottom: 5 }}>Vamos regar agora?</h3>
              <p style={{ fontSize: 13 }}>
                Registe como você está hoje no diário e mantenha seu jardim vivo.
              </p>
            </div>
            <div style={{ fontSize: 36 }} aria-hidden="true">🚿</div>
          </div>
        </div>
      ) : data.pending > 0 ? (
        <div
          className="card cta-banner cta-blue"
          style={{ cursor: "pointer" }}
          onClick={() => setView("exercises")}
          role="button"
          tabIndex={0}
          aria-label="Ir para meus exercícios"
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setView("exercises")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 22, marginBottom: 7 }} aria-hidden="true">📋</div>
              <h3 style={{ fontSize: 17, marginBottom: 5 }}>
                Você tem {data.pending} exercício{data.pending > 1 ? "s" : ""} pendente{data.pending > 1 ? "s" : ""}!
              </h3>
              <p style={{ fontSize: 13 }}>
                Clique aqui para começar quando estiver pronto(a).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">🎉</div>
            <p>Você está em dia com o seu cuidado hoje!</p>
          </div>
        </div>
      )}
    </div>
  );
}