import { useState, useEffect, useCallback } from "react";
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
    description: "",
    questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] 
  });

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const token = session.access_token;
      // Consultas con paso de token obligatorio para validar el RLS
      const [therapists, invites, globals] = await Promise.all([
        db.query("users", { filter: { role: "therapist" }, order: "created_at.desc" }, token),
        db.query("invites", { order: "created_at.desc" }, token),
        db.query("global_exercises", { order: "created_at.desc" }, token)
      ]);

      setData({
        therapists: Array.isArray(therapists) ? therapists : [],
        invites: Array.isArray(invites) ? invites : [],
        globalExercises: Array.isArray(globals) ? globals : []
      });
    } catch (e) {
      console.error("Erro crítico na carga de dados:", e.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab]);

  const handleUpdateStatus = async (id, newStatus) => {
    if (!confirm(`Alterar status para ${newStatus}?`)) return;
    try {
      await db.update("users", { id }, { status: newStatus }, session.access_token);
      fetchData();
    } catch (e) { alert("Erro ao atualizar: " + e.message); }
  };

  const handleSaveExercise = async () => {
    if (!newEx.title || newEx.questions.some(q => !q.text.trim())) {
      return alert("Preencha o título e todas as perguntas.");
    }
    try {
      await db.insert("global_exercises", {
        ...newEx,
        questions: JSON.stringify(newEx.questions),
        created_by: session.id
      }, session.access_token);
      alert("Modelo oficial publicado com sucesso!");
      setNewEx({ title: "", category: CATEGORIES[0], description: "", questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] });
      fetchData();
    } catch (e) { alert("Erro ao salvar: " + e.message); }
  };

  const updateQuestion = (id, field, value) => {
    setNewEx(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    }));
  };

  return (
    <div className="admin-layout page-fade-in">
      {/* SIDEBAR NATIVA */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <h1>Equilibre<span>Admin</span></h1>
          <div className="admin-sidebar__badge"> Bernard Master </div>
        </div>
        
        <nav className="admin-sidebar__nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>📊 Status Geral</button>
          <button className={activeTab === 'professionals' ? 'active' : ''} onClick={() => setActiveTab('professionals')}>🧠 Psicólogas</button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>📚 Biblioteca Global</button>
          <button className={activeTab === 'invites' ? 'active' : ''} onClick={() => setActiveTab('invites')}>🎟️ Auditoria Convites</button>
        </nav>

        <div className="admin-sidebar__footer">
          <p>{session.email}</p>
          <button onClick={logout} className="btn-logout-admin">Sair do Painel</button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="admin-main">
        {loading && <div className="admin-loader">Sincronizando com Supabase...</div>}

        {activeTab === "overview" && (
          <div className="admin-overview">
            <h2 className="admin-title">Dashboard de Controle</h2>
            <div className="admin-stats">
              <div className="admin-stat-card">
                <span className="admin-stat-card__label">Psicólogas</span>
                <span className="admin-stat-card__val">{data.therapists.length}</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-card__label">Convites Ativos</span>
                <span className="admin-stat-card__val">{data.invites.filter(i => i.status === 'pending').length}</span>
              </div>
              <div className="admin-stat-card">
                <span className="admin-stat-card__label">Modelos Globais</span>
                <span className="admin-stat-card__val">{data.globalExercises.length}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "professionals" && (
          <div className="admin-table-container">
            <h2 className="admin-title">Gestão de Profissionais</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Profissional</th><th>CRP</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {data.therapists.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong><br/><span>{t.email}</span></td>
                    <td className="admin-mono">{t.crp || 'Pendente'}</td>
                    <td><span className={`admin-tag admin-tag--${t.status}`}>{t.status}</span></td>
                    <td>
                      {t.status === 'pending' && <button className="btn-admin btn-admin--approve" onClick={() => handleUpdateStatus(t.id, 'active')}>Aprovar</button>}
                      {t.status === 'active' && <button className="btn-admin btn-admin--suspend" onClick={() => handleUpdateStatus(t.id, 'suspended')}>Suspender</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "library" && (
          <div className="admin-library-grid">
            <div className="admin-editor">
              <h2 className="admin-title">Criar Modelo Oficial</h2>
              <div className="admin-editor__form">
                <input className="admin-input" placeholder="Título do Exercício" value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} />
                <select className="admin-input" value={newEx.category} onChange={e => setNewEx({...newEx, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                
                <div className="admin-editor__questions">
                  {newEx.questions.map((q, i) => (
                    <div key={q.id} className="admin-q-block">
                      <div className="admin-q-block__header">
                        <span className="admin-q-block__index">#{i + 1}</span>
                        <div className="admin-type-dots">
                          {Object.keys(TYPE_META).map(type => (
                            <button 
                              key={type} 
                              className={q.type === type ? 'active' : ''} 
                              onClick={() => updateQuestion(q.id, 'type', type)}
                              title={TYPE_META[type].label}
                            >{TYPE_META[type].icon}</button>
                          ))}
                        </div>
                        <button className="btn-del-q" onClick={() => setNewEx({...newEx, questions: newEx.questions.filter(item => item.id !== q.id)})}>✕</button>
                      </div>
                      <textarea className="admin-textarea-ghost" placeholder="Enunciado ou instrução..." value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)} />
                    </div>
                  ))}
                </div>
                <button className="btn-add-q" onClick={() => setNewEx({...newEx, questions: [...newEx.questions, {id: "q_"+Date.now(), type: 'open', text: ''}]})}>+ Novo Elemento</button>
                <button className="btn-publish-admin" onClick={handleSaveExercise}>Publicar na Biblioteca</button>
              </div>
            </div>

            <div className="admin-library-list">
              <h2 className="admin-title">Modelos Ativos</h2>
              <div className="admin-grid-cards">
                {data.globalExercises.map(ex => (
                  <div key={ex.id} className="admin-ex-card">
                    <span className={`admin-tag admin-tag--${CATEGORY_CLASS[ex.category]}`}>{ex.category}</span>
                    <h3>{ex.title}</h3>
                    <p>{JSON.parse(ex.questions).length} elementos configurados</p>
                    <button className="btn-delete-ex" onClick={async () => { if(confirm("Remover permanentemente?")) { await db.delete("global_exercises", {id: ex.id}, session.access_token); fetchData(); } }}>Eliminar</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
