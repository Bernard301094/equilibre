import { useState, useEffect, useCallback } from "react";
import db from "../../services/db";
import auth from "../../services/auth";
import { CATEGORIES, LS_SESSION_KEY } from "../../utils/constants"; // 👈 Importação da chave do LocalStorage
import "./AdminDashboard.css";

// FORMATOS BASEADOS EM EVIDÊNCIAS
const TYPE_META = {
  open: { icon: "📝", label: "Aberta" },
  options: { icon: "🔘", label: "Múltipla Escolha" },
  scale: { icon: "🔢", label: "Escala Numérica" },
  slider: { icon: "🎚️", label: "Termômetro (SUDS)" },
  rpd: { icon: "🧠", label: "RPD (Cascata)" },
  cardSort: { icon: "🃏", label: "Card Sorting (Valores)" },
  matrix: { icon: "➕", label: "Matriz ACT" },
  instruction: { icon: "📢", label: "Instrução" }
};

// MODELOS CLÍNICOS PRÉ-CONFIGURADOS
const CLINICAL_TEMPLATES = [
  {
    title: "Registro de Pensamentos Disfuncionais (RPD)",
    category: "TCC",
    questions: [{ id: "q_rpd_1", type: "rpd", text: "Preencha o seu RPD identificando a Situação, Emoção, Pensamento e Distorção." }]
  },
  {
    title: "Mapeamento de Valores Pessoais",
    category: "ACT",
    questions: [{ id: "q_act_1", type: "cardSort", text: "Organize os seguintes valores por nível de importância na sua vida hoje:", options: ["Saúde Física", "Família", "Sucesso Profissional", "Honestidade", "Lazer/Diversão", "Espiritualidade", "Liberdade Financeira", "Amizades"] }]
  },
  {
    title: "A Matriz ACT",
    category: "ACT",
    questions: [{ id: "q_act_2", type: "matrix", text: "Preencha os quadrantes da Matriz ACT.", areas: ["O que é importante para mim?", "O que me afasta dos meus valores?", "O que faço para fugir do desconforto?", "O que faço que me aproxima de quem quero ser?"] }]
  },
  {
    title: "Termômetro de Exposição",
    category: "TCC",
    questions: [{ id: "q_suds_1", type: "slider", text: "De 0 a 10, qual é o seu nível de ansiedade (SUDS) neste momento?", minLabel: "0 (Totalmente Calmo)", maxLabel: "10 (Pânico Extremo)" }]
  }
];

export default function AdminDashboard({ session, logout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [data, setData] = useState({ therapists: [], patients: [], invites: [], globalExercises: [] });
  
  const [newEx, setNewEx] = useState({ 
    id: null, 
    title: "", 
    category: (CATEGORIES && CATEGORIES[0]) || "Geral", 
    questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] 
  });

  const [editingUser, setEditingUser] = useState(null);

  // ESTADO PARA A CRIAÇÃO DE CONTA TESTE
  const [testUser, setTestUser] = useState({ name: "Paciente Teste", email: "", password: "teste", role: "patient", therapist_id: "" });
  const [creatingTest, setCreatingTest] = useState(false);

  const token = session?.access_token;
  const adminId = session?.id;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const pTherapists = db.query("users", { filter: { role: "therapist" }, order: "created_at.desc" }, token).catch(() => []);
      const pPatients   = db.query("users", { filter: { role: "patient" }, order: "created_at.desc" }, token).catch(() => []);
      const pInvites    = db.query("invites", { order: "created_at.desc" }, token).catch(() => []);
      const pGlobals    = db.query("global_exercises", { order: "created_at.desc" }, token).catch(() => []);

      const [therapists, patients, invites, globals] = await Promise.all([pTherapists, pPatients, pInvites, pGlobals]);

      setData({ 
        therapists: Array.isArray(therapists) ? therapists : [], 
        patients: Array.isArray(patients) ? patients : [], 
        invites: Array.isArray(invites) ? invites : [], 
        globalExercises: Array.isArray(globals) ? globals : [] 
      });
    } catch (e) { console.error("Erro ao carregar dados:", e.message); } 
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData, activeTab]);
  const handleTabChange = (tab) => { setActiveTab(tab); setIsMenuOpen(false); };

  // --- ACÕES CRUD BASE ---
  const handleUserStatus = async (id, newStatus) => {
    if (!window.confirm(`Mudar o status deste utilizador para "${newStatus}"?`)) return;
    try { await db.update("users", { id }, { status: newStatus }, token); fetchData(); } catch (e) { alert("Erro ao atualizar."); }
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    try { await db.update("users", { id: editingUser.id }, { name: editingUser.name, crp: editingUser.crp }, token); setEditingUser(null); fetchData(); } catch (e) { alert("Erro ao guardar."); }
  };

  const handleRevokeInvite = async (code) => {
    if (!window.confirm("Deseja revogar este convite?")) return;
    try { await db.update("invites", { code }, { status: 'revoked' }, token); fetchData(); } catch (e) { alert("Erro ao revogar."); }
  };

  const handleGenerateMasterInvite = async () => {
    const code = "MASTER-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    try { await db.insert("invites", { code, status: 'pending', created_by: adminId }, token); fetchData(); alert(`Convite: ${code}`); } catch (e) { alert("Erro ao gerar."); }
  };

  const seedClinicalExercises = async () => {
    if (!window.confirm("Isto irá adicionar os modelos oficiais à base de dados. Deseja continuar?")) return;
    setLoading(true);
    try {
      for (const template of CLINICAL_TEMPLATES) {
        await db.insert("global_exercises", { title: template.title, category: template.category, questions: JSON.stringify(template.questions), created_by: adminId }, token);
      }
      alert("Modelos Clínicos gerados com sucesso!"); fetchData();
    } catch (e) { alert("Erro ao gerar exercícios: " + e.message); }
    setLoading(false);
  };

  const handleSaveModel = async () => {
    if(!newEx.title) return alert("O modelo precisa de um título.");
    try {
      const payload = { title: newEx.title, category: newEx.category, questions: JSON.stringify(newEx.questions) };
      if (newEx.id) { await db.update("global_exercises", { id: newEx.id }, payload, token); alert("Atualizado!"); } 
      else { await db.insert("global_exercises", { ...payload, created_by: adminId }, token); alert("Publicado!"); }
      setNewEx({ id: null, title: "", category: (CATEGORIES && CATEGORIES[0]) || "Geral", questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] });
      fetchData();
    } catch (e) { alert("Erro ao guardar modelo."); }
  };

  const handleEditModel = (model) => {
    let parsed = [];
    try { parsed = typeof model.questions === 'string' ? JSON.parse(model.questions) : model.questions; } catch(e) { parsed = [{ id: "q_" + Date.now(), type: "open", text: "" }]; }
    setNewEx({ id: model.id, title: model.title, category: model.category, questions: parsed }); window.scrollTo(0, 0);
  };

  const handleDeleteModel = async (id) => {
    if (!window.confirm("Deseja apagar este modelo permanentemente?")) return;
    try { await db.delete("global_exercises", { id }, token); fetchData(); } catch (e) { alert("Erro ao apagar modelo."); }
  };

  const handleTypeChange = (qIndex, newType) => {
    const newQuestions = newEx.questions.map((q, i) => {
      if (i !== qIndex) return q;
      const updatedQ = { ...q, type: newType };
      if (newType === 'cardSort' && !updatedQ.options) updatedQ.options = ["Opção 1", "Opção 2"];
      if (newType === 'options' && !updatedQ.options) updatedQ.options = ["Opção 1", "Opção 2"];
      if (newType === 'matrix' && !updatedQ.areas) updatedQ.areas = ["Quadrante 1", "Quadrante 2", "Quadrante 3", "Quadrante 4"];
      if (newType === 'slider' || newType === 'scale') { 
        updatedQ.minLabel = "0 (Nenhum)"; updatedQ.maxLabel = "10 (Máximo)"; 
        if (!updatedQ.text || updatedQ.text.trim() === "") { updatedQ.text = "De 0 a 10, qual é o seu nível de ansiedade (ou emoção) neste momento?"; }
      }
      return updatedQ;
    });
    setNewEx({...newEx, questions: newQuestions});
  };

  const handleDynamicArray = (qIndex, field, action, itemIndex = null, value = "") => {
    const newQuestions = newEx.questions.map((q, i) => {
      if (i !== qIndex) return q;
      const updatedQ = { ...q };
      const currentArray = updatedQ[field] || [];
      if (action === 'add') updatedQ[field] = [...currentArray, value || "Nova Opção"];
      else if (action === 'update') updatedQ[field] = currentArray.map((item, idx) => idx === itemIndex ? value : item);
      else if (action === 'remove') updatedQ[field] = currentArray.filter((_, idx) => idx !== itemIndex);
      return updatedQ;
    });
    setNewEx({...newEx, questions: newQuestions});
  };

  // --- DEV TOOLS LÓGICA ---
  const handleCreateTestAccount = async (e) => {
    e.preventDefault();
    setCreatingTest(true);
    try {
      const res = await auth.signUp(testUser.email, testUser.password, { name: testUser.name, role: testUser.role });
      const uid = res?.user?.id || res?.id;
      if (uid) {
        const payload = { status: 'active', role: testUser.role };
        if (testUser.role === 'patient' && testUser.therapist_id) payload.therapist_id = testUser.therapist_id;
        
        await db.update("users", { id: uid }, payload, token);
        alert("✅ Conta de teste criada e ativada com sucesso!");
        setTestUser({ name: "Paciente Teste", email: "", password: "teste", role: "patient", therapist_id: "" });
        fetchData();
      } else {
        alert("Usuário criado no Auth, mas ID não retornado.");
      }
    } catch(e) {
      alert("❌ Erro ao criar conta: " + e.message);
    } finally {
      setCreatingTest(false);
    }
  };

  // Login Dinâmico noutra conta (Impersonation)
  const handleLoginAs = async (email) => {
    const pwd = window.prompt(`Introduza a senha para a conta ${email}:`, "teste");
    if (!pwd) return;
    try {
      const res = await auth.signIn(email, pwd);
      if (res.access_token) {
        localStorage.setItem(LS_SESSION_KEY, JSON.stringify(res));
        window.location.href = "/"; // Recarga y entra como el nuevo usuario
      }
    } catch (e) {
      alert("Erro ao entrar na conta: " + e.message);
    }
  };


  // Apagar conta de teste
  const handleDeleteTest = async (id) => {
    if (!window.confirm("Deseja apagar o perfil desta conta de teste?\n\n(Nota: O e-mail continuará registado no Auth do Supabase por segurança, mas sumirá do sistema e a conta ficará inacessível).")) return;
    try {
      await db.delete("users", { id }, token);
      fetchData();
    } catch (e) {
      alert("Erro ao apagar: " + e.message);
    }
  };

  // Filtrar apenas contas de teste para a tabela de Dev Tools
  const testAccounts = [...data.therapists, ...data.patients].filter(u => 
    u.email?.toLowerCase().includes('teste') || u.email?.toLowerCase().includes('test')
  );

  return (
    <div className="admin-container page-fade-in">
      <div className="admin-mobile-header">
        <h1 className="admin-brand">Equilibre<span>Admin</span></h1>
        <button className="admin-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? "✕" : "☰"}</button>
      </div>

      {isMenuOpen && <div className="admin-sidebar-overlay" onClick={() => setIsMenuOpen(false)}></div>}

      <aside className={`admin-sidebar ${isMenuOpen ? "open" : ""}`}>
        <div className="admin-sidebar__header">
          <h1 className="admin-brand desktop-only">Equilibre<span>Admin</span></h1>
          <span className="admin-user-email">{session?.email}</span>
        </div>
        <nav className="admin-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleTabChange('overview')}>📊 Dashboard</button>
          <button className={activeTab === 'professionals' ? 'active' : ''} onClick={() => handleTabChange('professionals')}>🧠 Psicólogas</button>
          <button className={activeTab === 'patients' ? 'active' : ''} onClick={() => handleTabChange('patients')}>🫂 Pacientes</button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => handleTabChange('library')}>📚 Biblioteca</button>
          <button className={activeTab === 'invites' ? 'active' : ''} onClick={() => handleTabChange('invites')}>🎟️ Códigos</button>
          
          <div style={{height: '1px', background: '#e2e8f0', margin: '10px 0'}}></div>
          <button className={activeTab === 'dev' ? 'active' : ''} onClick={() => handleTabChange('dev')} style={{color: activeTab === 'dev' ? '#8b5cf6' : '#64748b'}}>🛠️ Dev Tools</button>
        </nav>
        <button onClick={logout} className="admin-btn-logout">Sair do Sistema</button>
      </aside>

      <main className="admin-content">
        {loading && <div className="admin-loading-bar">A carregar dados do servidor...</div>}

        {activeTab === "overview" && (
          <div className="admin-stats-grid">
            <div className="ev-preview__card admin-stat-card"><div className="stat-icon">👩‍⚕️</div><div className="stat-info"><h3>Psicólogas Ativas</h3><p>{data.therapists.filter(t => t.status === 'active').length}</p></div></div>
            <div className="ev-preview__card admin-stat-card"><div className="stat-icon">🫂</div><div className="stat-info"><h3>Pacientes Totais</h3><p>{data.patients.length}</p></div></div>
            <div className="ev-preview__card admin-stat-card"><div className="stat-icon">📈</div><div className="stat-info"><h3>Convites Usados</h3><p>{data.invites.length > 0 ? Math.round((data.invites.filter(i => i.status === 'used').length / data.invites.length) * 100) : 0}%</p></div></div>
          </div>
        )}

        {activeTab === "professionals" && (
          <div className="ev-preview__card admin-table-card">
            <div className="admin-card-header"><h2 className="admin-section-title">Gestão de Psicólogas</h2></div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead><tr><th>Nome / E-mail</th><th>ID do Sistema</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {data.therapists.map(t => (
                    <tr key={t.id}>
                      <td><div className="user-cell"><strong>{t.name}</strong><span>{t.email}</span></div></td>
                      <td className="admin-mono-small" style={{userSelect: 'all', cursor: 'copy'}} title="Clique duplo para copiar">{t.id}</td>
                      <td><span className={`admin-badge badge-${t.status}`}>{t.status}</span></td>
                      <td className="actions-cell">
                        {t.status === 'pending' && <button className="btn-approve" onClick={() => handleUserStatus(t.id, 'active')}>Aprovar</button>}
                        {t.status === 'active' && <button className="btn-warning" onClick={() => handleUserStatus(t.id, 'suspended')}>Suspender</button>}
                        {t.status === 'suspended' && <button className="btn-secondary" onClick={() => handleUserStatus(t.id, 'active')}>Reativar</button>}
                        <button className="btn-secondary" onClick={() => setEditingUser(t)}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "patients" && (
          <div className="ev-preview__card admin-table-card">
            <div className="admin-card-header"><h2 className="admin-section-title">Base de Pacientes</h2></div>
            <div className="table-responsive">
              <table className="admin-table">
                <thead><tr><th>Paciente</th><th>ID Psicóloga</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                  {data.patients.map(p => (
                    <tr key={p.id}>
                      <td><div className="user-cell"><strong>{p.name || 'Sem nome'}</strong><span>{p.email}</span></div></td>
                      <td className="admin-mono-small">{p.therapist_id || '---'}</td>
                      <td><span className={`admin-badge badge-${p.status || 'active'}`}>{p.status || 'active'}</span></td>
                      <td className="actions-cell">
                        {p.status !== 'suspended' 
                          ? <button className="btn-warning" onClick={() => handleUserStatus(p.id, 'suspended')}>Suspender</button>
                          : <button className="btn-secondary" onClick={() => handleUserStatus(p.id, 'active')}>Reativar</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "library" && (
           <div className="admin-library-layout">
             <div className="ev-preview__card admin-table-card" style={{ marginBottom: '30px', background: '#eff6ff', borderColor: '#bfdbfe' }}>
               <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
                 <div><h2 className="admin-section-title" style={{color: '#1d4ed8'}}>Aceleração Clínica</h2><p className="admin-section-desc">Gere automaticamente exercícios baseados em evidências (TCC/ACT).</p></div>
                 <button className="btn-publish" style={{width: 'auto', marginTop: 0}} onClick={seedClinicalExercises}>⚡ Injetar Modelos Clínicos</button>
               </div>
            </div>

             <div className="ev-preview__card form-card" style={{ marginBottom: '30px' }}>
              <h2 className="admin-section-title">{newEx.id ? "Editar Modelo Dinâmico" : "Construtor de Exercício Dinâmico"}</h2>
              <div className="form-group"><input className="admin-input" placeholder="Título do exercício" value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} /></div>
              <div className="admin-editor-list">
                {newEx.questions.map((q, qIndex) => (
                  <div key={q.id} className="admin-question-block">
                    <div className="admin-question-controls">
                      <div className="admin-types-wrapper">
                        {Object.keys(TYPE_META).map(type => (
                          <button key={type} className={q.type === type ? 'active' : ''} onClick={() => handleTypeChange(qIndex, type)}>
                            {TYPE_META[type].icon} <span className="type-label">{TYPE_META[type].label}</span>
                          </button>
                        ))}
                      </div>
                      <button className="btn-danger btn-delete-block" onClick={() => {
                        const copy = newEx.questions.filter((_, idx) => idx !== qIndex);
                        setNewEx({...newEx, questions: copy.length ? copy : [{id: "q_"+Date.now(), type: 'open', text: ''}]});
                      }}>🗑️</button>
                    </div>
                    <textarea className="admin-textarea" value={q.text} onChange={e => {
                      const newQuestions = newEx.questions.map((item, i) => i === qIndex ? { ...item, text: e.target.value } : item);
                      setNewEx({...newEx, questions: newQuestions});
                    }} placeholder="Escreva o enunciado ou instrução..." rows="2" />
                    
                    {(q.type === 'options' || q.type === 'cardSort') && (
                      <div className="admin-dynamic-panel">
                        <label className="admin-label">{q.type === 'cardSort' ? 'Cartas a serem ordenadas' : 'Opções de Resposta'}</label>
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="dynamic-input-row">
                            <input className="admin-input-small" value={opt} onChange={e => handleDynamicArray(qIndex, 'options', 'update', oIdx, e.target.value)} />
                            <button className="btn-icon-danger" onClick={() => handleDynamicArray(qIndex, 'options', 'remove', oIdx)}>✕</button>
                          </div>
                        ))}
                        <button className="btn-add-dynamic" onClick={() => handleDynamicArray(qIndex, 'options', 'add', null, "Nova Opção")}>+ Adicionar</button>
                      </div>
                    )}

                    {q.type === 'matrix' && (
                      <div className="admin-dynamic-panel wheel-panel">
                        <label className="admin-label">Quadrantes da Matriz</label>
                        <div className="wheel-grid">
                          {(q.areas || []).map((area, aIdx) => (
                            <div key={aIdx} className="dynamic-input-row">
                              <input className="admin-input-small" value={area} onChange={e => handleDynamicArray(qIndex, 'areas', 'update', aIdx, e.target.value)} />
                              <button className="btn-icon-danger" onClick={() => handleDynamicArray(qIndex, 'areas', 'remove', aIdx)}>✕</button>
                            </div>
                          ))}
                        </div>
                        <button className="btn-add-dynamic" onClick={() => handleDynamicArray(qIndex, 'areas', 'add', null, "Novo Quadrante")}>+ Adicionar</button>
                      </div>
                    )}

                    {(q.type === 'scale' || q.type === 'slider') && (
                      <div className="admin-dynamic-panel scale-panel">
                        <label className="admin-label">Rótulos da Escala / Termômetro</label>
                        <div className="scale-inputs">
                          <input className="admin-input-small" placeholder="Mínimo" value={q.minLabel || ""} onChange={e => { const nQ = newEx.questions.map((item, i) => i === qIndex ? { ...item, minLabel: e.target.value } : item); setNewEx({...newEx, questions: nQ}); }} />
                          <span className="scale-divider">até</span>
                          <input className="admin-input-small" placeholder="Máximo" value={q.maxLabel || ""} onChange={e => { const nQ = newEx.questions.map((item, i) => i === qIndex ? { ...item, maxLabel: e.target.value } : item); setNewEx({...newEx, questions: nQ}); }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button className="admin-btn-ghost" onClick={() => setNewEx({...newEx, questions: [...newEx.questions, {id: "q_"+Date.now(), type: 'open', text: ''}]})}>+ Adicionar Pergunta</button>
              </div>
              <button className="btn-publish" onClick={handleSaveModel}>Publicar Modelo</button>
            </div>
            
            <div className="ev-preview__card admin-table-card">
               <div className="admin-card-header"><h2 className="admin-section-title">Modelos Publicados</h2></div>
               <div className="table-responsive">
                 <table className="admin-table">
                   <thead><tr><th>Título</th><th>Data</th><th>Ações</th></tr></thead>
                   <tbody>
                     {data.globalExercises.map(ex => (
                       <tr key={ex.id}>
                         <td><strong>{ex.title}</strong></td>
                         <td>{new Date(ex.created_at).toLocaleDateString()}</td>
                         <td className="actions-cell">
                           <button className="btn-secondary" onClick={() => handleEditModel(ex)}>Editar</button>
                           <button className="btn-danger" onClick={() => handleDeleteModel(ex.id)}>Excluir</button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
           </div>
        )}

        {activeTab === "invites" && (
           <div className="ev-preview__card admin-table-card">
              <div className="admin-card-header" style={{display: 'flex', justifyContent: 'space-between'}}><h2 className="admin-section-title">Auditoria de Convites</h2><button className="btn-approve" onClick={handleGenerateMasterInvite}>+ Gerar Convite Master</button></div>
           </div>
        )}

        {/* --- NOVA ABA: DEV TOOLS --- */}
        {activeTab === "dev" && (
          <div className="admin-library-layout">
            <div className="ev-preview__card form-card" style={{ marginBottom: '30px', borderTop: '4px solid #8b5cf6' }}>
              <h2 className="admin-section-title" style={{color: '#8b5cf6'}}>🛠️ Injetar Nova Conta de Teste</h2>
              <p className="admin-section-desc">Crie contas ativas instantaneamente, sem precisar de convites.</p>

              <form onSubmit={handleCreateTestAccount} style={{marginTop: '25px', maxWidth: '500px'}}>
                <div className="form-group">
                  <label className="admin-label">Nome de Teste</label>
                  <input className="admin-input" value={testUser.name} onChange={e => setTestUser({...testUser, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="admin-label">E-mail (De preferência que contenha a palavra "teste")</label>
                  <input type="email" className="admin-input" value={testUser.email} onChange={e => setTestUser({...testUser, email: e.target.value})} placeholder="paciente_teste@equilibre.com" required />
                </div>
                <div className="form-group">
                  <label className="admin-label">Senha (Recomendado: "teste" ou "teste123")</label>
                  <input type="text" className="admin-input" value={testUser.password} onChange={e => setTestUser({...testUser, password: e.target.value})} required minLength={5} />
                </div>
                <div className="form-group">
                  <label className="admin-label">Tipo de Conta</label>
                  <select className="admin-input" value={testUser.role} onChange={e => setTestUser({...testUser, role: e.target.value})}>
                     <option value="patient">🫂 Paciente (Simula o App Móvel)</option>
                     <option value="therapist">🧠 Psicóloga (Simula o Painel Web)</option>
                  </select>
                </div>

                {testUser.role === 'patient' && (
                  <div className="form-group">
                    <label className="admin-label" style={{color: '#3b82f6'}}>Vincular a uma Psicóloga (Cole o ID do Sistema aqui)</label>
                    <input className="admin-input" placeholder="Ex: e23d-4c55..." value={testUser.therapist_id} onChange={e => setTestUser({...testUser, therapist_id: e.target.value})} />
                  </div>
                )}

                <button type="submit" className="btn-publish" style={{background: '#8b5cf6', borderColor: '#7c3aed'}} disabled={creatingTest}>
                  {creatingTest ? "A injetar conta no banco..." : "🚀 Criar Conta"}
                </button>
              </form>
            </div>

            {/* TABELA DE CONTAS DE TESTE (IMPERSONATION) */}
            <div className="ev-preview__card admin-table-card">
              <div className="admin-card-header">
                <h2 className="admin-section-title">Contas de Teste Ativas</h2>
                <p className="admin-section-desc">Detetadas automaticamente (e-mail contém "teste").</p>
              </div>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead><tr><th>Nome / E-mail</th><th>Tipo</th><th>Ações</th></tr></thead>
                  <tbody>
                    {testAccounts.map(u => (
                      <tr key={u.id}>
                        <td><div className="user-cell"><strong>{u.name}</strong><span>{u.email}</span></div></td>
                        <td><span className={`admin-badge badge-${u.status}`}>{u.role === 'therapist' ? '🧠 Terapeuta' : '🫂 Paciente'}</span></td>
                        <td className="actions-cell">
                          <button className="btn-sage" style={{background: '#8b5cf6', color: 'white', border: 'none'}} onClick={() => handleLoginAs(u.email)}>
                            🚪 Entrar como
                          </button>
                          <button className="btn-danger" onClick={() => handleDeleteTest(u.id)}>
                            🗑️ Apagar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {testAccounts.length === 0 && <tr><td colSpan="3" className="admin-empty-msg">Nenhuma conta de teste encontrada.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {editingUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header"><h3>Editar Dados</h3><button onClick={() => setEditingUser(null)}>✕</button></div>
            <form onSubmit={handleSaveUserEdit}>
              <div className="form-group"><label className="admin-label">Nome Completo</label><input required className="admin-input" value={editingUser.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} /></div>
              {editingUser.role === 'therapist' && (<div className="form-group"><label className="admin-label">CRP</label><input className="admin-input" value={editingUser.crp || ""} onChange={e => setEditingUser({...editingUser, crp: e.target.value})} /></div>)}
              <button type="submit" className="btn-publish" style={{marginTop: '10px'}}>Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}