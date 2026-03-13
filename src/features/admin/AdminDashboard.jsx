import { useState, useEffect } from "react";
import db from "../../services/db";
import { parseQuestions } from "../../utils/parsing";
import { QUESTION_TYPES, CATEGORIES, CATEGORY_CLASS } from "../../utils/constants";
import "./AdminDashboard.css";

const TYPE_META = {
  open: { icon: "📝", label: "Aberta" },
  scale: { icon: "🔢", label: "Escala" },
  reflect: { icon: "💭", label: "Reflexão" },
  instruction: { icon: "📢", label: "Instrução" }
};

export default function AdminDashboard({ session, logout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState({ therapists: [], invites: [], globalExercises: [] });
  const [loading, setLoading] = useState(false);
  const [newEx, setNewEx] = useState({ 
    title: "", 
    category: CATEGORIES[0], 
    questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] 
  });

  useEffect(() => {
    if (session?.access_token) {
      fetchData();
    }
  }, [activeTab, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = session.access_token;
      
      // Consultas directas con token explícito
      const therapists = await db.query("users", { filter: { role: "therapist" } }, token);
      const invites = await db.query("invites", {}, token);
      const globals = await db.query("global_exercises", { order: "created_at.desc" }, token);

      setData({
        therapists: Array.isArray(therapists) ? therapists : [],
        invites: Array.isArray(invites) ? invites : [],
        globalExercises: Array.isArray(globals) ? globals : []
      });
    } catch (e) {
      console.error("Erro técnico ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await db.update("users", { id }, { status: newStatus }, session.access_token);
      alert("Status atualizado!");
      fetchData();
    } catch (e) { alert(e.message); }
  };

  const handleSave = async () => {
    if (!newEx.title || newEx.questions.some(q => !q.text.trim())) return alert("Preencha o título e perguntas");
    try {
      await db.insert("global_exercises", {
        ...newEx,
        questions: JSON.stringify(newEx.questions),
        created_by: session.id
      }, session.access_token);
      alert("Publicado com sucesso!");
      setNewEx({ title: "", category: CATEGORIES[0], questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] });
      fetchData();
    } catch (e) { alert(e.message); }
  };

  const updateQuestion = (id, field, value) => {
    setNewEx(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    }));
  };

  return (
    <div className="admin-container page-fade-in">
      <aside className="admin-sidebar">
        <h1 className="admin-brand">Equilibre<span>Admin</span></h1>
        <p className="admin-user-tag">{session.email}</p>
        <nav className="admin-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>📊 Dashboard</button>
          <button className={activeTab === 'professionals' ? 'active' : ''} onClick={() => setActiveTab('professionals')}>🧠 Psicólogas</button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>📚 Biblioteca</button>
          <button className={activeTab === 'invites' ? 'active' : ''} onClick={() => setActiveTab('invites')}>🎟️ Convites</button>
        </nav>
        <button onClick={logout} className="admin-btn-logout">Sair do Sistema</button>
      </aside>

      <main className="admin-content">
        {loading && <p>Carregando dados reais...</p>}
        
        {activeTab === "overview" && (
          <div className="admin-stats-grid">
            <div className="ev-preview__card admin-stat-card">
              <h3>Psicólogas Registradas</h3>
              <p>{data.therapists.length}</p>
            </div>
            <div className="ev-preview__card admin-stat-card">
              <h3>Total de Convites</h3>
              <p>{data.invites.length}</p>
            </div>
          </div>
        )}

        {activeTab === "professionals" && (
          <div className="ev-preview__card">
            <h2 className="admin-content__heading">Aprovação de Profissionais</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Nome</th><th>CRP</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {data.therapists.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong><br/><small>{t.email}</small></td>
                    <td>{t.crp || '---'}</td>
                    <td><span className={`admin-badge badge-${t.status}`}>{t.status}</span></td>
                    <td>
                      {t.status === 'pending' && (
                        <button className="btn-approve-sm" onClick={() => handleUpdateStatus(t.id, 'active')}>Ativar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "library" && (
          <div className="admin-grid-layout">
            <div className="ev-preview__card">
              <h3 className="admin-content__heading">Editor Profissional</h3>
              <input className="admin-input" placeholder="Título do Modelo" value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} />
              <div className="admin-questions-list">
                {newEx.questions.map((q, i) => (
                  <div key={q.id} className="admin-question-editor ev-question-card">
                    <div className="admin-type-selector">
                      {Object.keys(TYPE_META).map(type => (
                        <button key={type} className={q.type === type ? 'active' : ''} onClick={() => updateQuestion(q.id, 'type', type)}>
                          {TYPE_META[type].icon}
                        </button>
                      ))}
                    </div>
                    <textarea className="admin-input-ghost" placeholder="Pergunta..." value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} />
                    <button className="btn-delete-small" onClick={() => setNewEx({...newEx, questions: newEx.questions.filter(item => item.id !== q.id)})}>✕</button>
                  </div>
                ))}
                <button className="btn-add-ghost" onClick={() => setNewEx({...newEx, questions: [...newEx.questions, {id: "q_"+Date.now(), type: 'open', text: ''}]})}>+ Adicionar Bloco</button>
              </div>
              <button className="btn btn-sage w-full mt-4" onClick={handleSave}>Publicar Modelo</button>
            </div>

            <div className="ev-grid">
              {data.globalExercises.map(ex => (
                <div key={ex.id} className="ev-ex-card ev-ex-card--global">
                  <div className="ev-ex-card__title">{ex.title}</div>
                  <div className="ev-ex-card__count">📝 {JSON.parse(ex.questions).length} blocos</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
