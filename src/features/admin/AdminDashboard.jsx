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
  
  // Estado para creación de ejercicios
  const [newEx, setNewEx] = useState({ 
    title: "", 
    category: CATEGORIES[0], 
    questions: [{ id: "q_" + Date.now(), type: "open", text: "" }] 
  });

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const token = session.access_token;
      // Consultas con token explícito para el RLS de Bernard
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
      console.error("Erro na sincronização:", e.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData, activeTab]);

  return (
    <div className="admin-container page-fade-in">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__header">
          <h1 className="admin-brand">Equilibre<span>Admin</span></h1>
          <span className="admin-user-email">{session.email}</span>
        </div>
        
        <nav className="admin-nav">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>📊 Dashboard</button>
          <button className={activeTab === 'professionals' ? 'active' : ''} onClick={() => setActiveTab('professionals')}>🧠 Psicólogas</button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>📚 Biblioteca</button>
          <button className={activeTab === 'invites' ? 'active' : ''} onClick={() => setActiveTab('invites')}>🎟️ Auditoria</button>
        </nav>

        <button onClick={logout} className="admin-btn-logout">Sair</button>
      </aside>

      {/* CONTENIDO */}
      <main className="admin-content">
        {loading && <div className="admin-loading-bar">Carregando dados...</div>}

        {/* 1. DASHBOARD OVERVIEW */}
        {activeTab === "overview" && (
          <div className="admin-stats-grid">
            <div className="ev-preview__card admin-stat-card">
              <h3>Psicólogas Ativas</h3>
              <p>{data.therapists.filter(t => t.status === 'active').length}</p>
            </div>
            <div className="ev-preview__card admin-stat-card">
              <h3>Convites Ativos</h3>
              <p>{data.invites.filter(i => i.status === 'pending').length}</p>
            </div>
          </div>
        )}

        {/* 2. GESTIÓN DE PSICÓLOGAS */}
        {activeTab === "professionals" && (
          <div className="ev-preview__card admin-table-card">
            <h2 className="admin-section-title">Aprovação de Profissionais</h2>
            <table className="admin-table">
              <thead>
                <tr><th>Nome</th><th>CRP</th><th>Status</th><th>Ação</th></tr>
              </thead>
              <tbody>
                {data.therapists.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong><br/><span>{t.email}</span></td>
                    <td>{t.crp || '---'}</td>
                    <td><span className={`admin-badge badge-${t.status}`}>{t.status}</span></td>
                    <td>
                      {t.status === 'pending' && (
                        <button className="btn-approve" onClick={async () => {
                          await db.update("users", {id: t.id}, {status: 'active'}, session.access_token);
                          fetchData();
                        }}>Ativar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. AUDITORÍA DE CONVITES (La que te faltaba) */}
        {activeTab === "invites" && (
          <div className="ev-preview__card admin-table-card">
            <h2 className="admin-section-title">Auditoria de Códigos</h2>
            <p className="admin-section-desc">Histórico de convites gerados pelas psicólogas para seus pacientes.</p>
            <table className="admin-table">
              <thead>
                <tr><th>Código</th><th>Status</th><th>Criação</th><th>Paciente (ID)</th></tr>
              </thead>
              <tbody>
                {data.invites.map(inv => (
                  <tr key={inv.code}>
                    <td className="admin-code-cell">{inv.code}</td>
                    <td>
                      <span className={`admin-badge badge-${inv.status === 'used' ? 'active' : 'pending'}`}>
                        {inv.status === 'used' ? 'Utilizado' : 'Pendente'}
                      </span>
                    </td>
                    <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="admin-mono-small">{inv.used_by || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.invites.length === 0 && <p className="admin-empty-msg">Nenhum convite encontrado.</p>}
          </div>
        )}

        {/* 4. BIBLIOTECA GLOBAL */}
        {activeTab === "library" && (
          <div className="admin-library-layout">
            <div className="ev-preview__card">
              <h2 className="admin-section-title">Novo Modelo Equilibre</h2>
              <input className="admin-input" placeholder="Título" value={newEx.title} onChange={e => setNewEx({...newEx, title: e.target.value})} />
              <div className="admin-editor-list">
                {newEx.questions.map((q, i) => (
                  <div key={q.id} className="admin-question-block">
                    <div className="admin-question-controls">
                      {Object.keys(TYPE_META).map(type => (
                        <button key={type} className={q.type === type ? 'active' : ''} onClick={() => {
                          const copy = [...newEx.questions];
                          copy[i].type = type;
                          setNewEx({...newEx, questions: copy});
                        }}>{TYPE_META[type].icon}</button>
                      ))}
                    </div>
                    <textarea className="admin-textarea" value={q.text} onChange={e => {
                      const copy = [...newEx.questions];
                      copy[i].text = e.target.value;
                      setNewEx({...newEx, questions: copy});
                    }} placeholder="Enunciado..." />
                  </div>
                ))}
                <button className="admin-btn-ghost" onClick={() => setNewEx({...newEx, questions: [...newEx.questions, {id: "q_"+Date.now(), type: 'open', text: ''}]})}>+ Adicionar Bloco</button>
              </div>
              <button className="btn-publish" onClick={async () => {
                await db.insert("global_exercises", { ...newEx, questions: JSON.stringify(newEx.questions), created_by: session.id }, session.access_token);
                alert("Modelo Oficial Publicado!");
                fetchData();
              }}>Publicar Biblioteca</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
