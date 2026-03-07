import { useState, useEffect, useRef } from "react";
import db from "../../services/db";
import { calcStreak, localDateOffset } from "../../utils/dates";
import { getPlantStage } from "../../utils/constants";
import toast from "../../utils/toast";
import AvatarDisplay from "../../components/shared/AvatarDisplay";
import EmptyState from "../../components/ui/EmptyState";
import PatientModal from "./PatientModal/PatientModal";
import { SkeletonList, SkeletonCard } from "../../components/ui/Skeleton";

export default function PatientsView({ session }) {
  const [patients,        setPatients]        = useState([]);
  const [invites,         setInvites]         = useState([]);
  const [streakMap,       setStreakMap]        = useState({});
  const [loading,         setLoading]         = useState(true);
  const [generating,      setGenerating]      = useState(false);
  const [unlinkTarget,    setUnlinkTarget]    = useState(null);
  const [deleteInvTarget, setDeleteInvTarget] = useState(null);
  const [copiedCode,      setCopiedCode]      = useState(null);
  const [managingPatient, setManagingPatient] = useState(null);
  const [isMobile,        setIsMobile]        = useState(window.innerWidth < 768);
  const inflightRef = useRef(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [pts, invs] = await Promise.all([
          db.query("users",   { filter: { therapist_id: session.id, role: "patient" } }, session.access_token),
          db.query("invites", { filter: { therapist_id: session.id }, order: "created_at.desc" }, session.access_token),
        ]);
        if (!active) return;

        const pList = Array.isArray(pts)  ? pts  : [];
        const pIds  = pList.map((p) => p.id);

        // Fetch diary and response dates for streak calculation (no private data)
        const [diaryRows, respRows] = await Promise.all([
          pIds.length > 0
            ? db.query(
                "diary_entries",
                { filterIn: { patient_id: pIds }, select: "patient_id,date" },
                session.access_token
              ).catch(() => [])
            : [],
          pIds.length > 0
            ? db.query(
                "responses",
                { filterIn: { patient_id: pIds }, select: "patient_id,completed_at" },
                session.access_token
              ).catch(() => [])
            : [],
        ]);

        if (!active) return;

        // Build streak per patient
        const sMap = {};
        for (const p of pList) {
          const diaryDates = (Array.isArray(diaryRows) ? diaryRows : [])
            .filter((d) => d.patient_id === p.id)
            .map((d) => d.date);
          const respDates = (Array.isArray(respRows) ? respRows : [])
            .filter((r) => r.patient_id === p.id)
            .map((r) => r.completed_at?.slice(0, 10))
            .filter(Boolean);
          sMap[p.id] = calcStreak([...diaryDates, ...respDates]);
        }

        setPatients(pList);
        setInvites(Array.isArray(invs) ? invs : []);
        setStreakMap(sMap);
      } catch (e) {
        toast.error("Erro ao carregar dados: " + e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.id, session.access_token]);

  const generateInvite = async () => {
    if (inflightRef.current || generating) return;
    inflightRef.current = true;
    setGenerating(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.insert("invites", { code, therapist_id: session.id, status: "pending" }, session.access_token);
      const fresh = await db.query("invites", { filter: { therapist_id: session.id }, order: "created_at.desc" }, session.access_token);
      setInvites(Array.isArray(fresh) ? fresh : []);
      toast.success("Código de convite gerado!");
    } catch (e) {
      toast.error("Erro ao gerar convite: " + e.message);
    } finally {
      setGenerating(false);
      inflightRef.current = false;
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.info(`Código ${code} copiado!`);
  };

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    try {
      await db.update("users", { id: unlinkTarget.id }, { therapist_id: null }, session.access_token);
      setPatients((prev) => prev.filter((p) => p.id !== unlinkTarget.id));
      toast.success(`${unlinkTarget.name} desvinculado com sucesso.`);
      setUnlinkTarget(null);
    } catch (e) {
      toast.error("Erro ao desvincular: " + e.message);
      setUnlinkTarget(null);
    }
  };

  const confirmDeleteInvite = async () => {
    if (!deleteInvTarget?.code) return;
    try {
      await db.delete("invites", { code: deleteInvTarget.code }, session.access_token);
      setInvites((prev) => prev.filter((i) => i.code !== deleteInvTarget.code));
      toast.success("Convite excluído.");
      setDeleteInvTarget(null);
    } catch (e) {
      toast.error("Erro ao excluir convite: " + e.message);
      setDeleteInvTarget(null);
    }
  };

  if (loading) {
    return (
      <div style={{ animation: "fadeUp .4s ease" }}>
        <div className="page-header">
          <h2>Meus Pacientes</h2>
          <p>Gerencie seus pacientes e envie convites</p>
        </div>
        <div className="grid-2">
          <div className="card"><SkeletonList rows={3} /></div>
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Meus Pacientes</h2>
        <p>Gerencie seus pacientes e envie convites</p>
      </div>

      <div className="patients-grid">

        {/* ── Pacientes ativos ── */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>
            Pacientes Ativos ({patients.length})
          </h3>

          {patients.length === 0 ? (
            <EmptyState message="Nenhum paciente registado." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {patients.map((p) => {
                const streak = streakMap[p.id] ?? 0;
                const stage  = getPlantStage(streak);
                return (
                  <div key={p.id} className="patient-card-row">
                    {/* Avatar + info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <AvatarDisplay
                        name={p.name}
                        avatarUrl={p.avatar_url}
                        size={38}
                        className="p-avatar"
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "var(--blue-dark)",
                            marginBottom: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.email}
                        </div>
                      </div>
                    </div>

                    {/* ── Streak / Plant indicator ── */}
                    <div
                      title={`${stage.label} — ${streak} dia${streak !== 1 ? "s" : ""} seguido${streak !== 1 ? "s" : ""}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: streak === 0 ? "var(--warm)" : "rgba(122,158,135,0.12)",
                        border: `1px solid ${streak === 0 ? "var(--warm)" : "rgba(122,158,135,0.3)"}`,
                        borderRadius: 20,
                        padding: "4px 10px",
                        flexShrink: 0,
                        cursor: "default",
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">
                        {stage.icon}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: streak === 0 ? "var(--text-muted)" : stage.color,
                        }}
                      >
                        {streak}d
                      </span>
                    </div>

                    {/* Botões */}
                    <div className="patient-card-actions">
                      <button
                        className="btn btn-sage btn-sm"
                        style={{ flex: isMobile ? 1 : "none", minHeight: isMobile ? 44 : "auto" }}
                        onClick={() => setManagingPatient(p)}
                      >
                        Gerenciar
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{
                          flex: isMobile ? 1 : "none",
                          minHeight: isMobile ? 44 : "auto",
                          borderColor: "var(--danger)",
                          color: "var(--danger)",
                        }}
                        onClick={() => setUnlinkTarget(p)}
                        aria-label={`Desvincular ${p.name}`}
                      >
                        Desvincular
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Convites ── */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Convidar Novo Paciente</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
            Gere um código único e partilhe com o seu paciente. Ao usá-lo no registo,
            ele ficará automaticamente vinculado à sua conta.
          </p>

          <button
            className="btn btn-sage"
            onClick={generateInvite}
            disabled={generating}
            aria-busy={generating}
            style={{ marginBottom: 24, width: isMobile ? "100%" : "auto", minHeight: isMobile ? 48 : "auto" }}
          >
            {generating ? "Gerando..." : "Gerar Novo Código"}
          </button>

          <h4 style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Convites Gerados
          </h4>

          {invites.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Nenhum convite gerado ainda.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invites.map((inv) => (
              <div
                key={inv.code}
                className="invite-row"
                style={{ opacity: inv.status === "used" ? 0.6 : 1 }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString("pt-BR") : ""}
                </div>

                {inv.status === "used" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, letterSpacing: 1, color: "var(--text-muted)" }}>
                      {inv.code}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sage-dark)", background: "var(--sage-light)", padding: "4px 8px", borderRadius: 6 }}>
                      Utilizado
                    </span>
                  </div>
                ) : (
                  <div className="invite-actions">
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: isMobile ? 18 : 16, letterSpacing: 2, color: "var(--blue-dark)" }}>
                      {inv.code}
                    </span>

                    <button
                      onClick={() => copyCode(inv.code)}
                      aria-label={`Copiar código ${inv.code}`}
                      className="invite-action-btn"
                      style={{
                        background: copiedCode === inv.code ? "var(--sage-light)" : "none",
                        color: copiedCode === inv.code ? "var(--sage-dark)" : "inherit",
                      }}
                    >
                      {copiedCode === inv.code ? (
                        <><span aria-hidden="true">✅</span><span style={{ fontSize: 11, fontWeight: 600 }}>Copiado</span></>
                      ) : (
                        <span aria-hidden="true">📋</span>
                      )}
                    </button>

                    <button
                      aria-label="Enviar pelo WhatsApp"
                      className="invite-action-btn"
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `Olá! Estou usando o Equilibre para acompanhar o nosso trabalho.\n\nCrie a sua conta e use o código de convite:\n\n*${inv.code}*`
                        );
                        window.open(`https://wa.me/?text=${msg}`, "_blank");
                      }}
                      style={{ background: "none" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
                        <circle cx="16" cy="16" r="16" fill="#25D366" />
                        <path d="M23.5 8.5A10.44 10.44 0 0 0 16 5.5a10.5 10.5 0 0 0-9.08 15.73L5.5 26.5l5.43-1.42A10.5 10.5 0 0 0 26.5 16a10.44 10.44 0 0 0-3-7.5zm-7.5 16.16a8.71 8.71 0 0 1-4.44-1.21l-.32-.19-3.22.84.86-3.14-.21-.33a8.75 8.75 0 1 1 7.33 4.03zm4.8-6.55c-.26-.13-1.55-.77-1.79-.85s-.41-.13-.59.13-.67.85-.83 1-.3.2-.56.07a7.13 7.13 0 0 1-2.1-1.3 7.9 7.9 0 0 1-1.45-1.81c-.15-.26 0-.4.11-.53s.26-.3.4-.46a1.8 1.8 0 0 0 .26-.43.48.48 0 0 0 0-.46c-.07-.13-.59-1.42-.81-1.94s-.43-.44-.59-.45h-.5a1 1 0 0 0-.7.33 2.93 2.93 0 0 0-.91 2.18 5.1 5.1 0 0 0 1.06 2.7 11.65 11.65 0 0 0 4.47 3.95c.62.27 1.1.43 1.48.55a3.56 3.56 0 0 0 1.63.1 2.69 2.69 0 0 0 1.76-1.24 2.18 2.18 0 0 0 .15-1.24c-.06-.11-.24-.17-.5-.3z" fill="#fff"/>
                      </svg>
                    </button>

                    <button
                      aria-label={`Excluir convite ${inv.code}`}
                      className="invite-action-btn"
                      onClick={() => setDeleteInvTarget(inv)}
                      style={{ background: "none" }}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PatientModal ── */}
      {managingPatient && (
        <PatientModal
          patient={managingPatient}
          session={session}
          onClose={() => setManagingPatient(null)}
        />
      )}

      {/* ── Confirmar desvincular ── */}
      {unlinkTarget && (
        <div className="delete-overlay" onClick={() => setUnlinkTarget(null)}>
          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlink-title"
          >
            <div className="delete-icon" style={{ fontSize: 42, marginBottom: 16 }}>🔗</div>
            <div id="unlink-title" className="delete-title">Desvincular Paciente?</div>
            <div className="delete-desc">
              Tem certeza que deseja desvincular <strong>{unlinkTarget.name}</strong>?
              <br /><br />
              O paciente perderá acesso aos exercícios. O registo <strong>não</strong> será apagado.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setUnlinkTarget(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmUnlink}>Desvincular</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar excluir convite ── */}
      {deleteInvTarget && (
        <div className="delete-overlay" onClick={() => setDeleteInvTarget(null)}>
          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delinv-title"
          >
            <div className="delete-icon" style={{ fontSize: 42, marginBottom: 16 }}>🗑️</div>
            <div id="delinv-title" className="delete-title">Excluir Convite?</div>
            <div className="delete-desc">
              O código <strong>{deleteInvTarget.code}</strong> deixará de funcionar.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setDeleteInvTarget(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDeleteInvite}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}