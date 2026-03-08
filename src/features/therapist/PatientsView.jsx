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

        const pList = Array.isArray(pts) ? pts : [];
        const pIds  = pList.map((p) => p.id);

        const [diaryRows, respRows] = await Promise.all([
          pIds.length > 0
            ? db.query("diary_entries", { filterIn: { patient_id: pIds }, select: "patient_id,date" }, session.access_token).catch(() => [])
            : [],
          pIds.length > 0
            ? db.query("responses", { filterIn: { patient_id: pIds }, select: "patient_id,completed_at" }, session.access_token).catch(() => [])
            : [],
        ]);

        if (!active) return;

        const sMap = {};
        for (const p of pList) {
          const diaryDates = (Array.isArray(diaryRows) ? diaryRows : [])
            .filter((d) => d.patient_id === p.id).map((d) => d.date);
          const respDates = (Array.isArray(respRows) ? respRows : [])
            .filter((r) => r.patient_id === p.id)
            .map((r) => r.completed_at?.slice(0, 10)).filter(Boolean);
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
      <div className="page-fade-in">
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
    <div className="page-fade-in">
      <div className="page-header">
        <h2>Meus Pacientes</h2>
        <p>Gerencie seus pacientes e envie convites</p>
      </div>

      <div className="patients-grid">

        {/* ── Pacientes ativos ── */}
        <div className="card">
          <h3 className="pv-section-title">
            Pacientes Ativos ({patients.length})
          </h3>

          {patients.length === 0 ? (
            <EmptyState message="Nenhum paciente registado." />
          ) : (
            <div className="pv-patients-list">
              {patients.map((p) => {
                const streak = streakMap[p.id] ?? 0;
                const stage  = getPlantStage(streak);
                return (
                  <div key={p.id} className="patient-card-row">
                    {/* Avatar + info */}
                    <div className="pv-patient-info">
                      <AvatarDisplay
                        name={p.name}
                        avatarUrl={p.avatar_url}
                        size={38}
                        className="p-avatar"
                      />
                      <div className="pv-patient-text">
                        <div className="pv-patient-name">{p.name}</div>
                        <div className="pv-patient-email">{p.email}</div>
                      </div>
                    </div>

                    {/* Streak / Plant indicator */}
                    <div
                      className={`pv-streak-pill${streak === 0 ? " pv-streak-pill--zero" : ""}`}
                      title={`${stage.label} — ${streak} dia${streak !== 1 ? "s" : ""} seguido${streak !== 1 ? "s" : ""}`}
                    >
                      <span className="pv-streak-icon" aria-hidden="true">{stage.icon}</span>
                      <span
                        className="pv-streak-val"
                        style={{ color: streak === 0 ? "var(--text-muted)" : stage.color }}
                      >
                        {streak}d
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="patient-card-actions">
                      <button
                        className={`btn btn-sage btn-sm${isMobile ? " pv-btn-full" : ""}`}
                        onClick={() => setManagingPatient(p)}
                      >
                        Gerenciar
                      </button>
                      <button
                        className={`btn btn-outline btn-sm pv-btn-danger${isMobile ? " pv-btn-full" : ""}`}
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
          <h3 className="pv-section-title">Convidar Novo Paciente</h3>
          <p className="pv-invite-desc">
            Gere um código único e partilhe com o seu paciente. Ao usá-lo no registo,
            ele ficará automaticamente vinculado à sua conta.
          </p>

          <button
            className={`btn btn-sage pv-gen-btn${isMobile ? " pv-gen-btn--full" : ""}`}
            onClick={generateInvite}
            disabled={generating}
            aria-busy={generating}
          >
            {generating ? "Gerando..." : "Gerar Novo Código"}
          </button>

          <h4 className="pv-invites-label">Convites Gerados</h4>

          {invites.length === 0 && (
            <p className="pv-invites-empty">Nenhum convite gerado ainda.</p>
          )}

          <div className="pv-invites-list">
            {invites.map((inv) => (
              <div
                key={inv.code}
                className={`invite-row${inv.status === "used" ? " invite-row--used" : ""}`}
              >
                <div className="pv-inv-date">
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString("pt-BR") : ""}
                </div>

                {inv.status === "used" ? (
                  <div className="pv-inv-used">
                    <span className="pv-inv-code pv-inv-code--used">{inv.code}</span>
                    <span className="pv-inv-badge-used">Utilizado</span>
                  </div>
                ) : (
                  <div className="invite-actions">
                    <span className={`pv-inv-code${isMobile ? " pv-inv-code--mobile" : ""}`}>
                      {inv.code}
                    </span>

                    <button
                      onClick={() => copyCode(inv.code)}
                      aria-label={`Copiar código ${inv.code}`}
                      className={`invite-action-btn${copiedCode === inv.code ? " invite-action-btn--copied" : ""}`}
                    >
                      {copiedCode === inv.code ? (
                        <>
                          <span aria-hidden="true">✅</span>
                          <span className="pv-copied-label">Copiado</span>
                        </>
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
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
                        <circle cx="16" cy="16" r="16" fill="#25D366"/>
                        <path d="M23.5 8.5A10.44 10.44 0 0 0 16 5.5a10.5 10.5 0 0 0-9.08 15.73L5.5 26.5l5.43-1.42A10.5 10.5 0 0 0 26.5 16a10.44 10.44 0 0 0-3-7.5zm-7.5 16.16a8.71 8.71 0 0 1-4.44-1.21l-.32-.19-3.22.84.86-3.14-.21-.33a8.75 8.75 0 1 1 7.33 4.03zm4.8-6.55c-.26-.13-1.55-.77-1.79-.85s-.41-.13-.59.13-.67.85-.83 1-.3.2-.56.07a7.13 7.13 0 0 1-2.1-1.3 7.9 7.9 0 0 1-1.45-1.81c-.15-.26 0-.4.11-.53s.26-.3.4-.46a1.8 1.8 0 0 0 .26-.43.48.48 0 0 0 0-.46c-.07-.13-.59-1.42-.81-1.94s-.43-.44-.59-.45h-.5a1 1 0 0 0-.7.33 2.93 2.93 0 0 0-.91 2.18 5.1 5.1 0 0 0 1.06 2.7 11.65 11.65 0 0 0 4.47 3.95c.62.27 1.1.43 1.48.55a3.56 3.56 0 0 0 1.63.1 2.69 2.69 0 0 0 1.76-1.24 2.18 2.18 0 0 0 .15-1.24c-.06-.11-.24-.17-.5-.3z" fill="#fff"/>
                      </svg>
                    </button>

                    <button
                      aria-label={`Excluir convite ${inv.code}`}
                      className="invite-action-btn"
                      onClick={() => setDeleteInvTarget(inv)}
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
            <div className="delete-icon pv-modal-icon">🔗</div>
            <div id="unlink-title" className="delete-title">Desvincular Paciente?</div>
            <div className="delete-desc">
              Tem certeza que deseja desvincular <strong>{unlinkTarget.name}</strong>?
              <br /><br />
              O paciente perderá acesso aos exercícios. O registo <strong>não</strong> será apagado.
            </div>
            <div className="logout-dialog-actions">
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
            <div className="delete-icon pv-modal-icon">🗑️</div>
            <div id="delinv-title" className="delete-title">Excluir Convite?</div>
            <div className="delete-desc">
              O código <strong>{deleteInvTarget.code}</strong> deixará de funcionar.
            </div>
            <div className="logout-dialog-actions">
              <button className="btn btn-outline" onClick={() => setDeleteInvTarget(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDeleteInvite}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}