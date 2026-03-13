import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { QUESTION_TYPES, CATEGORIES, CATEGORY_CLASS } from "../../utils/constants";
import "./AdminDashboard.css";

const TYPE_META = {
  open:        { icon: "📝", label: "Resposta aberta" },
  scale:       { icon: "🔢", label: "Escala 0–10" },
  reflect:     { icon: "💭", label: "Reflexão" },
  instruction: { icon: "📢", label: "Instrução" },
};

export default function AdminDashboard({ session, logout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({ 
    therapists: [], 
    patients: [], 
    invites: [], 
    globalExercises: [] 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newEx, setNewEx] = useState({ 
    title: "", 
    description: "", 
    category: CATEGORIES[0], 
    questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = session.access_token;
      const [therapists, patients, invites, globals] = await Promise.all([
        db.query("users", { filter: { role: "therapist" }, order: "created_at.desc" }, token),
        db.query("users", { filter: { role: "patient" }, order: "created_at.desc" }, token),
        db.query("invites", { order: "created_at.desc" }, token),
        db.query("global_exercises", { order: "created_at.desc" }, token)
      ]);

      setData({
        therapists: Array.isArray(therapists) ? therapists : [],
        patients: Array.isArray(patients) ? patients : [],
        invites: Array.isArray(invites) ? invites : [],
        globalExercises: Array.isArray(globals) ? globals : []
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
    setNewEx({
      ...newEx,
      questions: newEx.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    });
  };

  const handleSaveExercise = async () => {
    if (!newEx.title || newEx.questions.some(q => !q.text.trim())) {
      alert("Complete todos os campos do exercício.");
      return;
    }
    try {
      await db.insert("global_exercises", {
        ...newEx,
        questions: JSON.stringify(newEx.questions),
        created_by: session.id
      }, session.access_token);
      alert("Modelo oficial publicado!");
      setNewEx({ title: "", description: "", category: CATEGORIES[0], questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  // --- RENDERS ---

  const renderOverview = () => {
    const pending = data.therapists.filter(t => t.status === "pending").length;
    return (
      <div className="admin-fade-in">
        <h2 className="admin-content__heading">Painel Geral</h2>
        <div className="admin-stats-grid">
          <div className="admin-stat-card ev-preview__card">
            <span className="admin-stat-card__icon">🧠</span>
            <div className="admin-stat-card__info">
              <h3>Psicólogas</h3>
              <p>{data.therapists.length}</p>
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
          <thead>
            <tr><th>Profissional</th><th>CRP</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {data.therapists.map(t => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong><br/><small>{t.email}</small></td>
                <td className="admin-mono">{t.crp || '---'}</td>
                <td><span className={`admin-badge badge-${t.status}`}>{t.status}</span></td>
                <td>
                  <div className="admin-table__actions">
                    {t.status === 'pending' && <button className="btn-approve-sm" onClick={() => handleUpdateStatus(t.id, 'active')}>Aprovar</button>}
                    {t.status === 'active' && <button className="btn-suspend-sm" onClick={() => handleUpdateStatus(t.id, 'suspended')}>Suspender</button>}
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
          <thead>
            <tr><th>Código</th><th>Status</th><th>Criação</th><th>Utilizado por</th></tr>
          </thead>
          <tbody>
            {data.invites.map(inv => (
              <tr key={inv.code}>
                <td className="admin-mono-bold">{inv.code}</td>
                <td><span className={`admin-badge badge-${inv.status === 'used' ? 'active' : 'pending'}`}>{inv.status}</span></td>
                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td className="admin-mono" style={{fontSize: '11px'}}>{inv.used_by || 'Aguardando'}</td>
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
            <button className="btn-add-ghost" onClick={() => setNewEx({...newEx, questions: [...newEx.questions, {id: "q_"+Date.now(), type: 'open', text: ''}]})}>+ Adicionar Elemento</button>
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

  return (
    <div className="admin-container page-fade-in">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h1 className="admin-brand">Equilibre<span>Admin</span></h1>
          <p className="admin-user-tag">{session.name}</p>
        </div>
        <nav className="admin-nav">
          <button className={`admin-nav__item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Dashboard</button>
          <button className={`admin-nav__item ${activeTab === 'professionals' ? 'active' : ''}`} onClick={() => setActiveTab('professionals')}>🧠 Profissionais</button>
          <button className={`admin-nav__item ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>📚 Biblioteca Global</button>
          <button className={`admin-nav__item ${activeTab === 'invites' ? 'active' : ''}`} onClick={() => setActiveTab('invites')}>🎟️ Convites</button>
        </nav>
        <div className="admin-sidebar__footer"><button onClick={logout} className="admin-btn-logout">Sair do Sistema</button></div>
      </aside>
      <main className="admin-content">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "professionals" && renderTherapists()}
        {activeTab === "library" && renderLibrary()}
        {activeTab === "invites" && renderInvites()}
      </main>
    </div>
  );
}