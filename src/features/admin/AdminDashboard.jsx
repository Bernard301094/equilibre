// src/features/admin/AdminDashboard.jsx
import { useState, useEffect } from "react";
import db from "../../services/db";
import { QUESTION_TYPES, CATEGORIES, CATEGORY_CLASS } from "../../utils/constants";
import "./AdminDashboard.css";

const SUPA_URL    = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY    = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
const LS_ADMIN_BACKUP = "eq_admin_session_backup";

const TYPE_META = {
  open:        { icon: "📝", label: "Resposta aberta" },
  scale:       { icon: "🔢", label: "Escala 0–10" },
  reflect:     { icon: "💭", label: "Reflexão" },
  instruction: { icon: "📢", label: "Instrução" },
};

const TEST_ACCOUNTS = {
  therapist: {
    email:    "test.terapeuta@equilibre.dev",
    password: "Equilibre@Test1",
    name:     "Terapeuta Teste",
    role:     "therapist",
    crp:      "00/00000",
  },
  patient: {
    email:    "test.paciente@equilibre.dev",
    password: "Equilibre@Test1",
    name:     "Paciente Teste",
    role:     "patient",
  },
};

// ── Admin API helpers ──────────────────────────────────────────────────────

const adminHeaders = () => ({
  apikey:         SERVICE_KEY,
  Authorization:  `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
});

async function adminGetUser(email) {
  let page = 1;
  while (true) {
    const res   = await fetch(`${SUPA_URL}/auth/v1/admin/users?page=${page}&per_page=50`, { headers: adminHeaders() });
    const data  = await res.json();
    const users = data?.users ?? [];
    const found = users.find(u => u.email === email);
    if (found) return found;
    if (users.length < 50) return null;
    page++;
  }
}

async function adminCreateUser(email, password, name, role) {
  const res  = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, role } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.msg || "Falha ao criar usuário.");
  return data;
}

async function adminSetPassword(userId, password) {
  const res  = await fetch(`${SUPA_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ password, email_confirm: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.msg || "Falha ao definir senha.");
  return data;
}

async function signInAs(email, password) {
  const res  = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data?.access_token) throw new Error(data?.error_description || data?.msg || "Falha no signIn.");
  return data;
}

// ── DevCard ────────────────────────────────────────────────────────────────

function DevCard({ roleKey, icon, title, extraInfo, exists, devLoading, onEnsure, onImpersonate, onDelete }) {
  const acc = TEST_ACCOUNTS[roleKey];
  return (
    <div className={`ev-preview__card devtools-card ${exists === true ? "devtools-card--active" : exists === false ? "devtools-card--inactive" : ""}`}>
      <div className="devtools-status-badge">
        {exists === null  && <span className="devtools-badge devtools-badge--checking">⏳ Verificando...</span>}
        {exists === true  && <span className="devtools-badge devtools-badge--exists">● Conta ativa</span>}
        {exists === false && <span className="devtools-badge devtools-badge--missing">○ Não criada</span>}
      </div>

      <div className="devtools-card__header">
        <span className="devtools-icon">{icon}</span>
        <div>
          <h3>{title}</h3>
          <code className="devtools-email">{acc.email}</code>
        </div>
      </div>

      <div className="devtools-creds">
        <span>Senha: <code>{acc.password}</code></span>
        {extraInfo && <span>{extraInfo}</span>}
      </div>

      <div className="devtools-actions">
        {/* ✅ Criar: solo cuando NO existe */}
        {exists !== true && (
          <button
            className="btn-devtools-create"
            disabled={devLoading || !SERVICE_KEY}
            onClick={onEnsure}
          >
            {devLoading ? "⏳ ..." : "✅ Criar conta"}
          </button>
        )}

        {/* 🎭 Entrar: solo cuando existe */}
        {exists === true && (
          <button
            className="btn-devtools-enter"
            disabled={devLoading || !SERVICE_KEY}
            onClick={onImpersonate}
          >
            {devLoading ? "⏳ ..." : "🎭 Entrar"}
          </button>
        )}

        {/* 🗑️ Delete: solo cuando existe */}
        {exists === true && (
          <button
            className="btn-devtools-delete"
            disabled={devLoading || !SERVICE_KEY}
            onClick={onDelete}
            title="Deletar conta de teste"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function AdminDashboard({ session, logout, setSession }) {
  const [activeTab,   setActiveTab]   = useState("overview");
  const [data,        setData]        = useState({ therapists: [], patients: [], invites: [], globalExercises: [] });
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [devLog,      setDevLog]      = useState([]);
  const [devLoading,  setDevLoading]  = useState(false);
  const [testStatus,  setTestStatus]  = useState({ therapist: null, patient: null });

  const [newEx, setNewEx] = useState({
    title: "", description: "", category: CATEGORIES[0],
    questions: [{ id: "q_" + Date.now(), type: "open", text: "" }],
  });

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === "devtools" && SERVICE_KEY) checkTestAccounts();
  }, [activeTab]);

  const checkTestAccounts = async () => {
    setTestStatus({ therapist: null, patient: null });
    const [t, p] = await Promise.all([
      adminGetUser(TEST_ACCOUNTS.therapist.email).then(u => !!u).catch(() => false),
      adminGetUser(TEST_ACCOUNTS.patient.email).then(u => !!u).catch(() => false),
    ]);
    setTestStatus({ therapist: t, patient: p });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = session.access_token;
      const [therapists, patients, invites, globals] = await Promise.all([
        db.query("users", { filter: { role: "therapist" }, order: "created_at.desc" }, token),
        db.query("users", { filter: { role: "patient"   }, order: "created_at.desc" }, token),
        db.query("invites", { order: "created_at.desc" }, token),
        db.query("global_exercises", { order: "created_at.desc" }, token),
      ]);
      setData({
        therapists:      Array.isArray(therapists) ? therapists : [],
        patients:        Array.isArray(patients)   ? patients   : [],
        invites:         Array.isArray(invites)    ? invites    : [],
        globalExercises: Array.isArray(globals)    ? globals    : [],
      });
    } catch (err) {
      setError("Erro de sincronização com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return;
    try {
      await db.update("users", { id }, { status: newStatus }, session.access_token);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const updateQuestion = (id, field, value) => {
    setNewEx({ ...newEx, questions: newEx.questions.map(q => q.id === id ? { ...q, [field]: value } : q) });
  };

  const handleSaveExercise = async () => {
    if (!newEx.title || newEx.questions.some(q => !q.text.trim())) {
      alert("Complete todos os campos do exercício."); return;
    }
    try {
      await db.insert("global_exercises", {
        ...newEx,
        questions: JSON.stringify(newEx.questions),
        created_by: session.id,
      }, session.access_token);
      alert("Modelo oficial publicado!");
      setNewEx({ title: "", description: "", category: CATEGORIES[0], questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  // ── Dev Tools ─────────────────────────────────────────────────────────────

  const log = (msg, type = "info") =>
    setDevLog(prev => [{ msg, type, ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 29)]);

  const ensureTestAccount = async (roleKey) => {
    const acc = TEST_ACCOUNTS[roleKey];
    setDevLoading(true);
    log(`⏳ Verificando conta ${acc.role}...`);
    try {
      let authUser = await adminGetUser(acc.email);
      let userId   = authUser?.id ?? null;

      if (authUser) {
        log(`ℹ️ Usuário já existe no Auth (${userId.slice(0, 8)}...).`, "warn");
        await adminSetPassword(userId, acc.password);
        log(`✅ Senha e confirmação atualizadas.`, "success");
      } else {
        log(`🆕 Criando usuário no Auth...`);
        const created = await adminCreateUser(acc.email, acc.password, acc.name, acc.role);
        userId = created.id;
        log(`✅ Criado no Auth (${userId.slice(0, 8)}...).`, "success");
        await adminSetPassword(userId, acc.password);
        log(`✅ Senha confirmada.`, "success");
      }

      log(`🔐 Fazendo signIn...`);
      const signInData = await signInAs(acc.email, acc.password);
      const token = signInData.access_token;
      userId = signInData.user?.id ?? userId;
      log(`✅ SignIn OK.`, "success");

      const existing = await db.query("users", { filter: { id: userId } }, session.access_token);
      if (!Array.isArray(existing) || existing.length === 0) {
        const row = {
          id: userId, name: acc.name, email: acc.email,
          role: acc.role, status: "active", therapist_id: null,
        };
        if (acc.role === "therapist") row.crp = acc.crp;
        if (acc.role === "patient") {
          const therapists = await db.query("users", { filter: { role: "therapist" }, order: "created_at.asc" }, session.access_token);
          if (Array.isArray(therapists) && therapists.length > 0) {
            row.therapist_id = therapists[0].id;
            log(`🔗 Paciente vinculado a: ${therapists[0].name}`);
          }
        }
        await db.insert("users", row, session.access_token);
        log(`✅ Perfil criado na tabela users.`, "success");
      } else {
        if (existing[0].status !== "active") {
          await db.update("users", { id: userId }, { status: "active" }, session.access_token);
          log(`🔧 Status resetado para 'active'.`, "warn");
        } else {
          log(`✅ Perfil já existe na tabela users.`, "success");
        }
      }

      setTestStatus(prev => ({ ...prev, [roleKey]: true }));
      fetchData();
      return { userId, token, refreshToken: signInData.refresh_token };
    } catch (err) {
      log(`❌ Erro: ${err.message}`, "error");
      return null;
    } finally {
      setDevLoading(false);
    }
  };

  const handleImpersonate = async (roleKey) => {
    const acc = TEST_ACCOUNTS[roleKey];
    setDevLoading(true);
    log(`🎭 Iniciando impersonação de ${acc.role}...`);
    try {
      const result = await ensureTestAccount(roleKey);
      if (!result) throw new Error("Não foi possível preparar a conta de teste.");
      const { userId, token, refreshToken } = result;

      const rows = await db.query("users", { filter: { id: userId } }, token);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error("Perfil não encontrado na tabela users.");

      localStorage.setItem(LS_ADMIN_BACKUP, JSON.stringify(session));
      log(`💾 Sessão admin salva. Redirecionando...`, "success");
      setSession({ ...rows[0], access_token: token, refresh_token: refreshToken ?? null });
    } catch (err) {
      log(`❌ Erro na impersonação: ${err.message}`, "error");
    } finally {
      setDevLoading(false);
    }
  };

  const handleDeleteTestAccount = async (roleKey) => {
    const SURL = import.meta.env.VITE_SUPABASE_URL;
    const SKEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
    const acc  = TEST_ACCOUNTS[roleKey];

    if (!confirm(`Deletar conta de teste "${acc.name}"?`)) return;
    setDevLoading(true);
    log(`🗑️ Iniciando delete de ${acc.role}...`);

    try {
      if (!SURL || !SKEY) throw new Error("VITE_SUPABASE_URL ou VITE_SUPABASE_SERVICE_KEY não definidos no .env");

      log(`🔍 Buscando no Auth...`);
      let page = 1, authUser = null;
      while (true) {
        const r = await fetch(`${SURL}/auth/v1/admin/users?page=${page}&per_page=50`, {
          headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json" }
        });
        const d = await r.json();
        const users = d?.users ?? [];
        const found = users.find(u => u.email === acc.email);
        if (found) { authUser = found; break; }
        if (users.length < 50) break;
        page++;
      }

      log(`🔍 Auth: ${authUser ? authUser.id.slice(0,8) + "..." : "não encontrado"}`, authUser ? "success" : "warn");

      if (!authUser) {
        log(`ℹ️ Conta não existe no Auth.`, "warn");
        setTestStatus(prev => ({ ...prev, [roleKey]: false }));
        return;
      }

      log(`🗄️ Removendo da tabela users...`);
      const r2 = await fetch(`${SURL}/rest/v1/users?id=eq.${authUser.id}`, {
        method: "DELETE",
        headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json" }
      });
      const t2 = await r2.text();
      log(`📥 Tabela users: ${r2.status} ${t2 || "(ok)"}`, r2.ok ? "success" : "warn");

      log(`🔐 Removendo do Auth...`);
      const r3 = await fetch(`${SURL}/auth/v1/admin/users/${authUser.id}`, {
        method: "DELETE",
        headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}`, "Content-Type": "application/json" }
      });
      const t3 = await r3.text();
      log(`📥 Auth: ${r3.status} ${t3 || "(ok)"}`, r3.ok ? "success" : "error");

      if (!r3.ok) throw new Error(`Auth delete falhou: ${r3.status} — ${t3}`);

      setTestStatus(prev => ({ ...prev, [roleKey]: false }));
      fetchData();
      log(`🏁 Conta ${acc.role} deletada com sucesso.`, "success");

    } catch (err) {
      log(`❌ ERRO: ${err.message}`, "error");
    } finally {
      setDevLoading(false);
    }
  };

  // ── Renders ───────────────────────────────────────────────────────────────

  const renderOverview = () => {
    const pending = data.therapists.filter(t => t.status === "pending").length;
    return (
      <div className="admin-fade-in">
        <h2 className="admin-content__heading">Painel Geral</h2>
        <div className="admin-stats-grid">
          <div className="admin-stat-card ev-preview__card">
            <span className="admin-stat-card__icon">🧠</span>
            <div className="admin-stat-card__info">
              <h3>Psicólogas</h3><p>{data.therapists.length}</p>
              {pending > 0 && <span className="stat-badge-warn">{pending} pendentes</span>}
            </div>
          </div>
          <div className="admin-stat-card ev-preview__card">
            <span className="admin-stat-card__icon">🌱</span>
            <div className="admin-stat-card__info"><h3>Pacientes</h3><p>{data.patients.length}</p></div>
          </div>
          <div className="admin-stat-card ev-preview__card">
            <span className="admin-stat-card__icon">📚</span>
            <div className="admin-stat-card__info"><h3>Biblioteca</h3><p>{data.globalExercises.length}</p></div>
          </div>
          <div className="admin-stat-card ev-preview__card">
            <span className="admin-stat-card__icon">🎟️</span>
            <div className="admin-stat-card__info"><h3>Convites</h3><p>{data.invites.length}</p></div>
          </div>
        </div>
      </div>
    );
  };

  const renderTherapists = () => (
    <div className="admin-fade-in ev-preview__card">
      <h2 className="admin-content__heading">Gestão de Profissionais</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead><tr><th>Profissional</th><th>CRP</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {data.therapists.map(t => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong><br/><small>{t.email}</small></td>
                <td className="admin-mono">{t.crp || '---'}</td>
                <td><span className={`admin-badge badge-${t.status}`}>{t.status}</span></td>
                <td>
                  <div className="admin-table__actions">
                    {t.status === 'pending'   && <button className="btn-approve-sm" onClick={() => handleUpdateStatus(t.id, 'active')}>Aprovar</button>}
                    {t.status === 'active'    && <button className="btn-suspend-sm" onClick={() => handleUpdateStatus(t.id, 'suspended')}>Suspender</button>}
                    {t.status === 'suspended' && <button className="btn-approve-sm" onClick={() => handleUpdateStatus(t.id, 'active')}>Reativar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInvites = () => (
    <div className="admin-fade-in ev-preview__card">
      <h2 className="admin-content__heading">Auditoria de Convites</h2>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead><tr><th>Código</th><th>Status</th><th>Criação</th><th>Utilizado por</th></tr></thead>
          <tbody>
            {data.invites.map(inv => (
              <tr key={inv.code}>
                <td className="admin-mono-bold">{inv.code}</td>
                <td><span className={`admin-badge badge-${inv.status === 'used' ? 'active' : 'pending'}`}>{inv.status}</span></td>
                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td className="admin-mono" style={{fontSize:'11px'}}>{inv.used_by || 'Aguardando'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLibrary = () => (
    <div className="admin-grid-layout admin-fade-in">
      <section className="admin-section">
        <h2 className="admin-content__heading">Novo Modelo Profissional</h2>
        <div className="ev-preview__card">
          <div className="admin-field">
            <label className="ev-questions__label">Título</label>
            <input className="admin-input" type="text" value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} />
          </div>
          <div className="admin-field">
            <label className="ev-questions__label">Categoria</label>
            <select className="admin-input" value={newEx.category} onChange={e => setNewEx({...newEx, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="admin-questions-list">
            <label className="ev-questions__label">Elementos do Exercício</label>
            {newEx.questions.map((q, i) => (
              <div key={q.id} className="admin-question-editor ev-question-card">
                <div className="admin-question-header">
                  <span className="admin-question-num">{i + 1}</span>
                  <div className="admin-type-selector">
                    {QUESTION_TYPES.map(t => (
                      <button key={t.value} className={`type-dot ${q.type === t.value ? 'active' : ''}`} onClick={() => updateQuestion(q.id, 'type', t.value)}>{TYPE_META[t.value].icon}</button>
                    ))}
                  </div>
                  <button className="btn-delete-small" onClick={() => setNewEx({...newEx, questions: newEx.questions.filter(item => item.id !== q.id)})}>✕</button>
                </div>
                <textarea className="admin-input-ghost" placeholder="Texto da pergunta ou instrução..." value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} />
              </div>
            ))}
            <button className="btn-add-ghost" onClick={() => setNewEx({...newEx, questions: [...newEx.questions, {id:"q_"+Date.now(), type:'open', text:''}]})}>+ Adicionar Elemento</button>
          </div>
          <button className="btn btn-sage w-full mt-4" onClick={handleSaveExercise}>Publicar Modelo Oficial</button>
        </div>
      </section>
      <section className="admin-section">
        <h2 className="admin-content__heading">Modelos Ativos</h2>
        <div className="ev-grid">
          {data.globalExercises.map(ex => (
            <div key={ex.id} className="ev-ex-card ev-ex-card--global">
              <span className={`ex-cat ${CATEGORY_CLASS[ex.category]}`}>{ex.category}</span>
              <div className="ev-ex-card__title">{ex.title}</div>
              <div className="ev-ex-card__desc">{ex.description}</div>
              <button className="btn-delete-icon" onClick={async () => { if(confirm("Remover?")) { await db.delete("global_exercises", {id: ex.id}, session.access_token); fetchData(); }}}>🗑️</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderDevTools = () => (
    <div className="admin-fade-in">
      <h2 className="admin-content__heading">🛠️ Dev Tools</h2>
      <p className="admin-section-desc">
        Crie e acesse contas de teste sem sair do Admin. Um banner aparece para voltar ao painel quando estiver numa conta de teste.
      </p>

      {!SERVICE_KEY && (
        <div className="devtools-warning">
          ⚠️ <strong>VITE_SUPABASE_SERVICE_KEY</strong> não encontrada no <code>.env</code>. Adicione-a para usar o Dev Tools.<br/>
          <small>Supabase → Project Settings → API → service_role (secret)</small>
        </div>
      )}

      <div className="devtools-grid">
        <DevCard
          roleKey="therapist"
          icon="🧠"
          title="Conta Terapeuta"
          extraInfo={`CRP: ${TEST_ACCOUNTS.therapist.crp}`}
          exists={testStatus.therapist}
          devLoading={devLoading}
          onEnsure={() => ensureTestAccount("therapist")}
          onImpersonate={() => handleImpersonate("therapist")}
          onDelete={() => handleDeleteTestAccount("therapist")}
        />
        <DevCard
          roleKey="patient"
          icon="🌱"
          title="Conta Paciente"
          extraInfo="Vinculado ao 1º terapeuta ativo"
          exists={testStatus.patient}
          devLoading={devLoading}
          onEnsure={() => ensureTestAccount("patient")}
          onImpersonate={() => handleImpersonate("patient")}
          onDelete={() => handleDeleteTestAccount("patient")}
        />
      </div>

      <div className="devtools-log">
        <div className="devtools-log__header">
          <span>📋 Log de operações</span>
          <button onClick={() => setDevLog([])}>Limpar</button>
        </div>
        <div className="devtools-log__body">
          {devLog.length === 0 && <span className="devtools-log__empty">Nenhuma operação ainda.</span>}
          {devLog.map((entry, i) => (
            <div key={i} className={`devtools-log__line log-${entry.type}`}>
              <span className="log-ts">{entry.ts}</span>
              <span>{entry.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-container page-fade-in">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h1 className="admin-brand">Equilibre<span>Admin</span></h1>
          <p className="admin-user-tag">{session.name}</p>
        </div>
        <nav className="admin-nav">
          <button className={`admin-nav__item ${activeTab === 'overview'      ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Dashboard</button>
          <button className={`admin-nav__item ${activeTab === 'professionals' ? 'active' : ''}`} onClick={() => setActiveTab('professionals')}>🧠 Profissionais</button>
          <button className={`admin-nav__item ${activeTab === 'library'       ? 'active' : ''}`} onClick={() => setActiveTab('library')}>📚 Biblioteca Global</button>
          <button className={`admin-nav__item ${activeTab === 'invites'       ? 'active' : ''}`} onClick={() => setActiveTab('invites')}>🎟️ Convites</button>
          <button className={`admin-nav__item devtools-tab ${activeTab === 'devtools' ? 'active' : ''}`} onClick={() => setActiveTab('devtools')}>🛠️ Dev Tools</button>
        </nav>
        <div className="admin-sidebar__footer">
          <button onClick={logout} className="admin-btn-logout">Sair do Sistema</button>
        </div>
      </aside>
      <main className="admin-content">
        {error   && <div className="admin-error-bar">{error}</div>}
        {loading && <div className="admin-loading-bar">Carregando...</div>}
        {activeTab === "overview"      && renderOverview()}
        {activeTab === "professionals" && renderTherapists()}
        {activeTab === "library"       && renderLibrary()}
        {activeTab === "invites"       && renderInvites()}
        {activeTab === "devtools"      && renderDevTools()}
      </main>
    </div>
  );
}
