import { useState, useEffect, useCallback } from "react";

const LOGO = "/equilibre-icon.jpeg";

// ─── Supabase client ──────────────────────────────────────────────────────────
const SUPA_URL = "https://tbaurubvmakhmbzhqnqh.supabase.co";
// ⚠️  Reemplaza con tu anon key real desde:
// Supabase Dashboard → Settings → API → "anon public"
const SUPA_KEY = "sb_publishable_15_BDx6bY-VKAzJByuBajg_mpiGTNQh";

const db = {
  async query(table, options = {}, token = null) {
    let url = `${SUPA_URL}/rest/v1/${table}?`;
    // Strip spaces from select so "id, name, email" doesn't create a broken URL
    if (options.select) url += `select=${options.select.replace(/\s+/g, "")}&`;
    if (options.filter) {
      Object.entries(options.filter).forEach(([k, v]) => {
        url += `${k}=eq.${encodeURIComponent(v)}&`;
      });
    }
    // filterIn: { patient_id: ["id1","id2"] } → patient_id=in.(id1,id2)
    // Eliminates N+1 loops — fetches rows for many IDs in one request
    if (options.filterIn) {
      Object.entries(options.filterIn).forEach(([k, vals]) => {
        if (vals.length === 0) return;
        url += `${k}=in.(${vals.map(encodeURIComponent).join(",")})&`;
      });
    }
    if (options.order) url += `order=${options.order}&`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token || SUPA_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.msg || `Erro ao consultar ${table}`);
    }
    return res.json();
  },
  async insert(table, data, token = null) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token || SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.msg || `Erro ao inserir em ${table}`);
    }
    return res.json();
  },
  async update(table, filter, data, token = null) {
    let url = `${SUPA_URL}/rest/v1/${table}?`;
    Object.entries(filter).forEach(([k, v]) => {
      url += `${k}=eq.${encodeURIComponent(v)}&`;
    });
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token || SUPA_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.msg || `Erro ao atualizar ${table}`);
    }
    return res.json();
  },
  async remove(table, filter, token = null) {
    let url = `${SUPA_URL}/rest/v1/${table}?`;
    Object.entries(filter).forEach(([k, v]) => {
      url += `${k}=eq.${encodeURIComponent(v)}&`;
    });
    await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${token || SUPA_KEY}`,
      },
    });
  },
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
const auth = {
  async signUp(email, password, metaData) {
    const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: metaData }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.msg || err.message || "Erro ao criar conta");
    }
    return res.json();
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error_description || data?.msg || data?.message || "E-mail ou senha incorretos";
      throw new Error(msg);
    }
    return data;
  },
};

// ─── Seed exercises ───────────────────────────────────────────────────────────
const SEED_EXERCISES = [
  {
    id: "ex1",
    title: "Respiração 4-7-8",
    category: "Ansiedade",
    description: "Técnica de respiração para reduzir a ansiedade rapidamente.",
    questions: [
      { id: "q1", type: "reflect", text: "Antes de começar: em uma palavra, como você está se sentindo agora?" },
      { id: "q2", type: "instruction", text: "🌬️ Inspire pelo nariz contando até 4 — segure o ar contando até 7 — expire pela boca contando até 8. Repita 3 vezes." },
      { id: "q3", type: "scale", text: "De 0 a 10, qual é o seu nível de ansiedade ANTES do exercício?" },
      { id: "q4", type: "scale", text: "De 0 a 10, qual é o seu nível de ansiedade APÓS o exercício?" },
      { id: "q5", type: "open", text: "O que você percebeu no seu corpo durante a respiração? Descreva livremente." },
    ],
  },
  {
    id: "ex2",
    title: "Registro de Pensamentos",
    category: "Ansiedade",
    description: "Identificar e questionar pensamentos automáticos negativos.",
    questions: [
      { id: "q1", type: "open", text: "Descreva a situação que gerou ansiedade ou desconforto." },
      { id: "q2", type: "open", text: "Que pensamento automático surgiu nesse momento?" },
      { id: "q3", type: "scale", text: "Qual a intensidade desse sentimento de 0 a 10?" },
      { id: "q4", type: "open", text: "Que evidências confirmam esse pensamento?" },
      { id: "q5", type: "open", text: "Que evidências contradizem esse pensamento?" },
      { id: "q6", type: "open", text: "Como você poderia pensar de forma mais equilibrada sobre essa situação?" },
    ],
  },
  {
    id: "ex3",
    title: "Gratidão Diária",
    category: "Bem-estar",
    description: "Prática de foco no positivo para fortalecer o bem-estar emocional.",
    questions: [
      { id: "q1", type: "open", text: "Liste 3 coisas pelas quais você é grato(a) hoje (podem ser pequenas)." },
      { id: "q2", type: "open", text: "Qual dessas coisas te tocou mais profundamente? Por quê?" },
      { id: "q3", type: "reflect", text: "Feche os olhos por 30 segundos e sinta essa gratidão no seu corpo. Onde você a percebe fisicamente?" },
      { id: "q4", type: "open", text: "Como você poderia trazer mais momentos assim para a sua semana?" },
    ],
  },
  {
    id: "ex4",
    title: "Escaneamento Corporal",
    category: "Mindfulness",
    description: "Atenção plena ao corpo para reduzir tensão e aumentar presença.",
    questions: [
      { id: "q1", type: "instruction", text: "🧘 Deite-se ou sente-se confortavelmente. Feche os olhos. Comece percebendo seus pés — depois pernas, quadril, abdômen, peito, mãos, braços, ombros, pescoço e cabeça. Leve 3 minutos nesse percurso." },
      { id: "q2", type: "open", text: "Em quais partes do corpo você sentiu mais tensão ou desconforto?" },
      { id: "q3", type: "open", text: "Em quais partes você sentiu leveza ou relaxamento?" },
      { id: "q4", type: "scale", text: "Como você avalia sua qualidade de presença durante o exercício? (0 = muito distraído, 10 = totalmente presente)" },
      { id: "q5", type: "open", text: "O que esse exercício revelou sobre como você está carregando seu dia no corpo?" },
    ],
  },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --blue-dark: #17527c; --blue-mid: #86bcde; --blue-light: #b3d7ed;
    --yellow: #ffbd59; --orange: #f6943b;
    --sage-dark: #17527c; --sage: #86bcde; --sage-light: #b3d7ed;
    --accent: #f6943b; --accent-soft: #fff3dd;
    --cream: #f4f8fc; --warm: #deeaf5; --text: #1a2e3b; --text-muted: #6a8099;
    --white: #ffffff; --card: rgba(255,255,255,0.95); --danger: #c0544a;
  }
  
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); min-height: 100vh; }
  h1,h2,h3 { font-family: 'Playfair Display', serif; }

  .login-bg { min-height:100vh; background:linear-gradient(135deg,#17527c 0%,#86bcde 55%,#ffbd59 100%); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .login-bg::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 80% 60% at 70% 30%,rgba(255,255,255,0.12) 0%,transparent 60%); }
  .login-card { background:var(--white); border-radius:24px; padding:48px 40px; width:100%; max-width:420px; box-shadow:0 32px 80px rgba(0,0,0,0.18); position:relative; z-index:1; animation:fadeUp .5s ease both; }
  .login-logo { text-align:center; margin-bottom:28px; }
  .login-logo img { border-radius: 50%; }
  .login-logo h1 { font-size:30px; color:var(--blue-dark); margin-top:6px; letter-spacing:-.5px; }
  .login-logo p { color:var(--text-muted); font-size:13px; margin-top:4px; }
  .tab-switch { display:flex; background:var(--warm); border-radius:12px; padding:4px; margin-bottom:22px; }
  .tab-switch button { flex:1; padding:10px; border:none; background:transparent; border-radius:8px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500; color:var(--text-muted); transition:all .2s; }
  .tab-switch button.active { background:var(--white); color:var(--sage-dark); box-shadow:0 2px 8px rgba(0,0,0,0.08); }
  .field { margin-bottom:14px; }
  .field label { display:block; font-size:11px; font-weight:600; color:var(--text-muted); margin-bottom:5px; text-transform:uppercase; letter-spacing:.06em; }
  .field input { width:100%; padding:11px 14px; border:1.5px solid var(--warm); border-radius:10px; font-family:'DM Sans',sans-serif; font-size:15px; background:var(--cream); color:var(--text); outline:none; transition:border .2s; }
  .field input:focus { border-color:var(--sage); }
  .btn-primary { width:100%; padding:13px; border:none; border-radius:12px; background:var(--sage-dark); color:white; font-family:'DM Sans',sans-serif; font-size:15px; font-weight:500; cursor:pointer; transition:all .2s; margin-top:6px; }
  .btn-primary:hover { background:var(--blue-mid); transform:translateY(-1px); box-shadow:0 6px 20px rgba(23,82,124,0.3); }

  .layout { display:flex; min-height:100vh; }
  .sidebar { width:250px; background:var(--sage-dark); color:white; display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; z-index:10; }
  .sidebar-header { padding:26px 22px 18px; border-bottom:1px solid rgba(255,255,255,0.1); }
  .sidebar-header .brand { font-family:'Playfair Display',serif; font-size:22px; letter-spacing:-.3px; }
  .sidebar-header .role { font-size:10px; opacity:.55; margin-top:2px; text-transform:uppercase; letter-spacing:.1em; }
  .sidebar nav { flex:1; padding:14px 10px; }
  .nav-item { display:flex; align-items:center; gap:11px; padding:11px 14px; border-radius:10px; cursor:pointer; font-size:14px; color:rgba(255,255,255,0.65); transition:all .15s; margin-bottom:2px; border:none; background:transparent; width:100%; text-align:left; }
  .nav-item:hover { background:rgba(255,255,255,0.08); color:white; }
  .nav-item.active { background:rgba(255,255,255,0.15); color:white; font-weight:500; }
  .nav-item .icon { font-size:17px; }
  .sidebar-footer { padding:14px 10px; border-top:1px solid rgba(255,255,255,0.1); }
  .user-pill { display:flex; align-items:center; gap:10px; padding:8px 12px; border-radius:10px; }
  .avatar { width:34px; height:34px; border-radius:50%; background:var(--sage-light); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:var(--sage-dark); }
  .user-info .name { font-size:13px; font-weight:500; }
  .user-info .email { font-size:10px; opacity:.5; }
  .pill-actions { display: flex; gap: 6px; margin-left: auto; }
  .pill-btn { background: rgba(255,255,255,0.06); border: none; width: 32px; height: 32px; border-radius: 8px; color: rgba(255,255,255,0.65); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
  .pill-btn:hover { background: rgba(255,255,255,0.15); color: white; transform: translateY(-1px); }
  .pill-btn.delete:hover { background: rgba(192,84,74,0.25); color: #ff8a80; }
  .main { margin-left:250px; padding:38px; min-height:100vh; background:var(--cream); width:100%; box-sizing: border-box; }
  .patient-sidebar { background:#0e3d5e; }
  .page-header { margin-bottom:28px; }
  .page-header h2 { font-size:26px; color:var(--text); }
  .page-header p { color:var(--text-muted); margin-top:3px; font-size:14px; }

  .card { background:var(--card); border-radius:16px; padding:22px; box-shadow:0 2px 16px rgba(0,0,0,0.06); border:1px solid rgba(255,255,255,0.6); }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
  .grid-auto { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:18px; }
  .stat-card { background:var(--card); border-radius:16px; padding:22px; border:1px solid rgba(255,255,255,0.6); box-shadow:0 2px 12px rgba(0,0,0,0.05); }
  .stat-card .stat-icon { font-size:26px; margin-bottom:10px; }
  .stat-card .stat-val { font-family:'Playfair Display',serif; font-size:34px; color:var(--blue-dark); }
  .stat-card .stat-label { font-size:12px; color:var(--text-muted); margin-top:3px; }

  .ex-card { background:var(--card); border-radius:16px; padding:18px; border:1px solid rgba(255,255,255,0.6); box-shadow:0 2px 12px rgba(0,0,0,0.05); cursor:pointer; transition:all .2s; }
  .ex-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.1); }
  .ex-cat { display:inline-block; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; padding:3px 10px; border-radius:20px; background:var(--accent-soft); color:var(--accent); margin-bottom:9px; }
  .ex-cat.mindfulness { background:#e0f0fa; color:#17527c; }
  .ex-cat.bem-estar { background:#fff3dd; color:#c07010; }
  .ex-title { font-family:'Playfair Display',serif; font-size:16px; margin-bottom:5px; }
  .ex-desc { font-size:13px; color:var(--text-muted); line-height:1.5; }

  .patient-row { display:flex; align-items:center; gap:12px; padding:12px; border-radius:10px; cursor:pointer; transition:background .15s; margin-bottom:2px; }
  .patient-row:hover { background:var(--accent-soft); }
  .p-avatar { width:40px; height:40px; border-radius:50%; background:var(--sage-light); display:flex; align-items:center; justify-content:center; font-family:'Playfair Display',serif; font-size:15px; color:var(--sage-dark); flex-shrink:0; }
  .p-name { font-weight:500; font-size:14px; }
  .p-email { font-size:11px; color:var(--text-muted); }

  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); animation:fadeIn .2s; overflow-y:auto; }
  .modal { background:var(--white); border-radius:20px; padding:30px; width:100%; max-width:500px; animation:fadeUp .25s ease; }
  .modal h3 { font-family:'Playfair Display',serif; font-size:20px; margin-bottom:18px; }
  
  .btn { padding:9px 18px; border-radius:10px; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500; cursor:pointer; transition:all .15s; border:none; }
  .btn-outline { background:transparent; border:1.5px solid var(--warm); color:var(--text-muted); }
  .btn-outline:hover { border-color:var(--sage); color:var(--sage-dark); }
  .btn-sage { background:var(--sage-dark); color:white; }
  .btn-sage:hover { background:var(--sage); }
  .btn-sm { padding:6px 12px; font-size:12px; border-radius:8px; }
  .btn-accent { background:var(--accent); color:white; }
  .btn-accent:hover { opacity:.9; }
  
  .ex-pick { display:flex; align-items:center; gap:11px; padding:11px; border-radius:12px; border:1.5px solid var(--warm); margin-bottom:7px; cursor:pointer; transition:all .15s; }
  .ex-pick:hover { border-color:var(--sage); }
  .ex-pick.selected { border-color:var(--blue-dark); background:rgba(23,82,124,0.06); }
  .ex-pick .check { width:20px; height:20px; border-radius:50%; border:2px solid var(--warm); display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; transition:all .15s; }
  .ex-pick.selected .check { background:var(--blue-dark); border-color:var(--blue-dark); color:white; }

  .exercise-page { max-width:660px; margin:0 auto; }
  .progress-bar { height:5px; background:var(--warm); border-radius:3px; margin-bottom:30px; overflow:hidden; }
  .progress-fill { height:100%; background:var(--blue-dark); border-radius:3px; transition:width .4s ease; }
  .question-card { background:var(--white); border-radius:20px; padding:30px; box-shadow:0 4px 24px rgba(0,0,0,0.08); animation:fadeUp .3s ease; }
  .q-step { font-size:10px; text-transform:uppercase; letter-spacing:.09em; color:var(--sage); font-weight:600; margin-bottom:7px; }
  .q-text { font-family:'Playfair Display',serif; font-size:19px; line-height:1.5; color:var(--text); margin-bottom:22px; }
  .q-instruction { background:linear-gradient(135deg,var(--blue-dark),var(--blue-mid)); color:white; border-radius:16px; padding:22px; font-size:15px; line-height:1.75; text-align:center; }
  .scale-row { display:flex; gap:7px; justify-content:center; flex-wrap:wrap; margin-top:8px; }
  .scale-btn { width:46px; height:46px; border-radius:50%; border:2px solid var(--warm); background:transparent; font-size:14px; font-weight:500; cursor:pointer; transition:all .15s; font-family:'DM Sans',sans-serif; }
  .scale-btn:hover { border-color:var(--sage); color:var(--sage-dark); }
  .scale-btn.selected { background:var(--blue-dark); border-color:var(--blue-dark); color:white; transform:scale(1.1); }
  .q-textarea { width:100%; min-height:110px; padding:14px; border:1.5px solid var(--warm); border-radius:12px; font-family:'DM Sans',sans-serif; font-size:15px; background:var(--cream); color:var(--text); resize:vertical; outline:none; transition:border .2s; }
  .q-textarea:focus { border-color:var(--sage); }
  .q-reflect { background:var(--accent-soft); border-radius:12px; padding:14px 18px; font-size:14px; color:var(--accent); font-style:italic; line-height:1.6; margin-bottom:14px; }
  .q-nav { display:flex; justify-content:space-between; align-items:center; margin-top:22px; }

  .response-item { padding:12px; background:var(--cream); border-radius:10px; margin-bottom:7px; }
  .response-item .q-label { font-size:11px; color:var(--text-muted); margin-bottom:3px; }
  .response-item .q-answer { font-size:14px; color:var(--text); }
  .response-badge { display:inline-flex; align-items:center; gap:5px; font-size:11px; padding:3px 10px; border-radius:20px; font-weight:500; }
  .badge-done { background:#d4edd9; color:#2d7a3a; }
  .badge-pending { background:var(--warm); color:var(--text-muted); }

  .empty-state { text-align:center; padding:50px 20px; color:var(--text-muted); }
  .empty-state .empty-icon { font-size:44px; margin-bottom:14px; }
  .empty-state p { font-size:14px; }
  
  .success-banner { background:#d4edd9; color:#2d7a3a; border-radius:10px; padding:11px 14px; font-size:13px; margin-bottom:12px; text-align:center; }
  .error-msg { color:#c0544a; font-size:13px; margin-bottom:8px; }

  .spinner { display:flex; align-items:center; justify-content:center; height:100vh; font-family:'DM Sans',sans-serif; color:var(--text-muted); font-size:15px; gap:10px; }
  .spin { width:22px; height:22px; border:2.5px solid var(--warm); border-top-color:var(--blue-dark); border-radius:50%; animation:spin .7s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
  @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }

  .notif-bell { position:relative; background:none; border:none; cursor:pointer; font-size:20px; color:rgba(255,255,255,0.7); padding:4px; }
  .notif-bell:hover { color:white; }
  .notif-dot { position:absolute; top:0; right:0; width:16px; height:16px; border-radius:50%; background:var(--accent); color:white; font-size:9px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  
  .delete-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn .2s ease; }
  .delete-modal { background:white; border-radius:18px; padding:32px 28px; max-width:380px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.25); text-align:center; }
  .delete-icon { font-size:48px; margin-bottom:12px; }
  .delete-title { font-family:Playfair Display,serif; font-size:21px; margin-bottom:8px; color:var(--text); }
  .delete-desc { font-size:13px; color:var(--text-muted); line-height:1.65; margin-bottom:20px; }
  .delete-confirm-input { width:100%; padding:10px 14px; border:2px solid var(--warm); border-radius:10px; font-family:DM Sans,sans-serif; font-size:14px; outline:none; box-sizing:border-box; margin-bottom:18px; }
  .delete-confirm-input:focus { border-color:#c0444a; }
  .btn-danger { background:#c0444a; color:white; border:none; border-radius:10px; padding:11px 24px; font-size:14px; font-weight:600; cursor:pointer; font-family:DM Sans,sans-serif; transition:opacity .15s; }
  .btn-danger:disabled { opacity:.45; cursor:not-allowed; }
  .btn-danger:hover:not(:disabled) { opacity:.88; }

  .chart-wrap { padding:12px 0 4px; }
  .chart-label-row { display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:4px; }
  
  .mood-btn { width:44px; height:44px; border-radius:50%; border:2px solid var(--warm); background:transparent; font-size:22px; cursor:pointer; transition:all .15s; }
  .mood-btn.sel { border-color:var(--blue-dark); background:rgba(23,82,124,0.08); transform:scale(1.15); }
  
  .goal-bar-bg { height:10px; background:var(--warm); border-radius:6px; overflow:hidden; margin:8px 0 4px; }
  .goal-bar-fill { height:100%; border-radius:6px; background:linear-gradient(90deg,var(--blue-dark),var(--blue-mid)); transition:width .6s ease; }
  
  .due-chip { display:inline-flex; align-items:center; gap:4px; font-size:10px; padding:2px 8px; border-radius:20px; font-weight:600; }
  .due-ok { background:#ddeaff; color:#17527c; }
  .due-warn { background:#fff3dd; color:#c07010; }
  .due-late { background:#fde8e8; color:#c0444a; }
  
  .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:var(--cream); border-radius:10px; }
  .toggle { width:40px; height:22px; border-radius:11px; cursor:pointer; border:none; position:relative; transition:background .2s; }
  .toggle::after { content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:white; transition:transform .2s; }
  .toggle.on { background:var(--blue-dark); }
  .toggle.on::after { transform:translateX(18px); }
  .toggle.off { background:var(--warm); }

  @media(max-width:768px){
    .layout { flex-direction: column; }
    .sidebar { width: 100%; height: auto; position: relative; z-index: 10; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 20px; }
    .sidebar-header .role { margin-top: 0; }
    .sidebar nav { display: flex; overflow-x: auto; padding: 10px 20px; white-space: nowrap; gap: 10px; }
    .nav-item { width: auto; flex-shrink: 0; padding: 10px 14px; margin-bottom: 0; }
    .sidebar-footer { padding: 15px 20px; }
    .main { margin-left: 0; padding: 20px 15px; }
    .grid-3 { grid-template-columns: 1fr; }
    .grid-2 { grid-template-columns: 1fr; }
    .stat-card { padding: 18px; }
    .login-card { padding: 30px 24px; margin: 15px; width: calc(100% - 30px); box-sizing: border-box; }
    .modal { padding: 24px 20px; width: 95%; max-height: 85vh; }
    .page-header h2 { font-size: 22px; }
    .scale-btn { width: 38px; height: 38px; font-size: 13px; }
  }
`;

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseQuestions(ex) {
  return Array.isArray(ex.questions) ? ex.questions : JSON.parse(ex.questions || "[]");
}

function parseAnswers(r) {
  return Array.isArray(r.answers) ? r.answers : JSON.parse(r.answers || "[]");
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    // ── CSS global ─────────────────────────────────────────────────────────────
    // Injecting via document.head guarantees the styles persist across every
    // render path (loading, login, dashboard). A <style> inside JSX body gets
    // destroyed whenever React swaps the render branch (e.g. !ready → !session).
    if (!document.querySelector("style[data-app='equilibre']")) {
      const styleEl = document.createElement("style");
      styleEl.dataset.app = "equilibre";
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    document.title = "Equilibre";

    // ── Favicon ────────────────────────────────────────────────────────────────
    const favicon =
      document.querySelector("link[rel~='icon']") || document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/jpeg";
    favicon.href = "/equilibre-icon.jpeg";
    document.head.appendChild(favicon);

    // ── Google Fonts ───────────────────────────────────────────────────────────
    // @import inside a dynamic <style> tag is ignored by browsers — must use <link>
    if (!document.querySelector("link[data-fonts='equilibre']")) {
      const fonts = document.createElement("link");
      fonts.rel = "stylesheet";
      fonts.dataset.fonts = "equilibre";
      fonts.href =
        "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap";
      document.head.appendChild(fonts);
    }
  }, []);

  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [loginTab, setLoginTab] = useState("therapist");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem("equilibre_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) localStorage.setItem("equilibre_session", JSON.stringify(session));
    else localStorage.removeItem("equilibre_session");
  }, [session]);

  useEffect(() => {
    (async () => {
      try {
        const existing = await db.query("exercises", { select: "id" });
        if (!Array.isArray(existing) || existing.length === 0) {
          for (const ex of SEED_EXERCISES) {
            await db.insert("exercises", {
              ...ex,
              questions: JSON.stringify(ex.questions),
            });
          }
        }
        setReady(true);
      } catch {
        setDbError(true);
        setReady(true);
      }
    })();
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    try {
      const authData = await auth.signIn(loginForm.email, loginForm.password);
      if (!authData?.access_token) {
        throw new Error(authData?.error_description || authData?.msg || "Erro na autenticação.");
      }
      // Look up user row by UUID first; fall back to email if UUID doesn't match
      // (happens when signup stored a "u"+timestamp ID instead of the real UUID)
      let users = await db.query("users", { filter: { id: authData.user.id } }, authData.access_token);
      if (!Array.isArray(users) || users.length === 0) {
        const byEmail = await db.query("users", { filter: { email: loginForm.email } }, authData.access_token);
        if (Array.isArray(byEmail) && byEmail.length > 0) users = byEmail;
      }
      if (!Array.isArray(users) || users.length === 0) {
        // Last resort: build session from auth metadata
        const meta = authData.user?.user_metadata || {};
        const role = meta.role || loginTab;
        if (role !== loginTab) {
          setLoginError("Conta não encontrada para este perfil.");
          return;
        }
        setSession({
          id: authData.user.id,
          email: authData.user.email,
          name: meta.name || authData.user.email,
          role,
          access_token: authData.access_token,
        });
      } else {
        if (users[0].role !== loginTab) {
          setLoginError("Conta não encontrada para este perfil.");
          return;
        }
        setSession({ ...users[0], access_token: authData.access_token });
      }
      setView(loginTab === "patient" ? "home" : "dashboard");
    } catch (error) {
      setLoginError(error.message);
    }
  };

  const handleRegister = async (form) => {
    if (!form.name || !form.email || !form.password) return "Preencha todos os campos.";
    if (form.password !== form.confirm) return "As senhas não coincidem.";
    if (form.password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";

    let therapistId = null;

    if (form.role === "patient") {
      const code = form.inviteCode.trim().toUpperCase();
      const invites = await db.query("invites", { filter: { code } });
      if (!Array.isArray(invites) || invites.length === 0) return "Código inválido.";
      const invite = invites[0];
      if (invite.status !== "pending") return "Este código já foi utilizado.";
      therapistId = invite.therapist_id;
    }

    try {
      const authRes = await auth.signUp(form.email, form.password, {
        name: form.name,
        role: form.role,
      });
      const userId = authRes?.user?.id || "u" + Date.now();
      const newUser = {
        id: userId,
        name: form.name,
        email: form.email,
        role: form.role,
        therapist_id: therapistId,
      };
      await db.insert("users", newUser);

      if (form.role === "patient") {
        await db.update(
          "invites",
          { code: form.inviteCode.trim().toUpperCase() },
          { status: "used", used_by: userId, used_at: new Date().toISOString() }
        );
      }
      return null;
    } catch (error) {
      return error.message;
    }
  };

  // Determine content — keeping <style> in fixed tree position so React reuses
  // the same DOM node across all render states (no flash of unstyled content)
  let content;
  if (!ready) {
    content = (
      <div className="spinner">
        <div className="spin" />
        <span>Conectando ao Equilibre...</span>
      </div>
    );
  } else if (dbError) {
    content = (
      <div className="spinner">
        <span>⚠️ Erro ao conectar ao banco de dados. Verifique as configurações.</span>
      </div>
    );
  } else if (!session) {
    content = (
      <LoginPage
        tab={loginTab}
        setTab={setLoginTab}
        form={loginForm}
        setForm={setLoginForm}
        error={loginError}
        onLogin={handleLogin}
        onRegister={handleRegister}
        setLoginError={setLoginError}
      />
    );
  } else {
    content = session.role === "therapist" ? (
      <TherapistLayout
        session={session}
        setSession={setSession}
        view={view}
        setView={setView}
        modal={modal}
        setModal={setModal}
      />
    ) : (
      <PatientLayout
        session={session}
        setSession={setSession}
        view={view}
        setView={setView}
      />
    );
  }

  return (
    <>
      <style>{css}</style>
      {content}
    </>
  );
}

// ─── Login / Register ─────────────────────────────────────────────────────────
function LoginPage({ tab, setTab, form, setForm, error, onLogin, onRegister, setLoginError }) {
  const [mode, setMode] = useState("login");
  const [reg, setReg] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    inviteCode: "",
    role: "therapist",
  });
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReg = async () => {
    setRegError("");
    if (!reg.name.trim()) { setRegError("Informe seu nome."); return; }
    if (!reg.email.trim()) { setRegError("Informe seu e-mail."); return; }
    if (reg.password.length < 6) { setRegError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (reg.password !== reg.confirm) { setRegError("As senhas não coincidem."); return; }
    if (reg.role === "patient" && !reg.inviteCode.trim()) { setRegError("Informe o código de convite."); return; }
    setLoading(true);
    const err = await onRegister(reg);
    setLoading(false);
    if (err) { setRegError(err); return; }
    setRegSuccess("Conta criada com sucesso! Faça login.");
    setMode("login");
    setTab(reg.role);
    setReg({ name: "", email: "", password: "", confirm: "", inviteCode: "", role: "therapist" });
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <img src={LOGO} alt="Equilibre" style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 2 }} />
          <h1>Equilibre</h1>
          <p>Exercícios terapêuticos personalizados</p>
        </div>

        <div className="tab-switch">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); setRegError(""); setLoginError(""); }}
          >Entrar</button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => { setMode("register"); setRegError(""); setLoginError(""); }}
          >Criar conta</button>
        </div>

        {mode === "login" && (
          <>
            <div className="tab-switch" style={{ marginBottom: 18 }}>
              <button className={tab === "therapist" ? "active" : ""} onClick={() => setTab("therapist")}>Psicóloga</button>
              <button className={tab === "patient" ? "active" : ""} onClick={() => setTab("patient")}>Paciente</button>
            </div>
            {regSuccess && <div className="success-banner">✅ {regSuccess}</div>}
            <div className="field">
              <label>E-mail</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="seu@email.com" />
            </div>
            <div className="field">
              <label>Senha</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && onLogin()} />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn-primary" onClick={onLogin}>Entrar</button>
          </>
        )}

        {mode === "register" && (
          <>
            <div className="tab-switch" style={{ marginBottom: 18 }}>
              <button className={reg.role === "therapist" ? "active" : ""} onClick={() => setReg((r) => ({ ...r, role: "therapist" }))}>Sou Psicóloga</button>
              <button className={reg.role === "patient" ? "active" : ""} onClick={() => setReg((r) => ({ ...r, role: "patient" }))}>Sou Paciente</button>
            </div>
            <div className="field"><label>Nome completo</label><input value={reg.name} onChange={(e) => setReg((r) => ({ ...r, name: e.target.value }))} placeholder="Seu nome" /></div>
            <div className="field"><label>E-mail</label><input type="email" value={reg.email} onChange={(e) => setReg((r) => ({ ...r, email: e.target.value }))} placeholder="seu@email.com" /></div>
            <div className="field"><label>Senha</label><input type="password" value={reg.password} onChange={(e) => setReg((r) => ({ ...r, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
            <div className="field">
              <label>Confirmar senha</label>
              <input type="password" value={reg.confirm} onChange={(e) => setReg((r) => ({ ...r, confirm: e.target.value }))} placeholder="Repita a senha" onKeyDown={(e) => e.key === "Enter" && handleReg()} />
            </div>
            {reg.role === "patient" && (
              <div className="field">
                <label>Código de convite</label>
                <input value={reg.inviteCode} onChange={(e) => setReg((r) => ({ ...r, inviteCode: e.target.value.toUpperCase() }))} placeholder="Ex: AB3X9K7" style={{ fontFamily: "monospace", fontSize: 18, letterSpacing: ".12em" }} maxLength={8} />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Código único enviado pela sua psicóloga.</div>
              </div>
            )}
            {regError && <p className="error-msg">{regError}</p>}
            <button className="btn-primary" onClick={handleReg} disabled={loading}>
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
            <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
              Já tem conta?{" "}
              <span style={{ color: "var(--sage-dark)", cursor: "pointer", fontWeight: 500 }} onClick={() => setMode("login")}>Entrar</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({ session, onClose, onDeleted }) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const KEYWORD = "EXCLUIR";

  const handleDelete = async () => {
    setError("");
    setLoading(true);
    try {
      for (const [table, field] of [
        ["assignments", "patient_id"],
        ["responses", "patient_id"],
        ["diary_entries", "patient_id"],
        ["invites", "therapist_id"],
        ["notifications", "therapist_id"],
        ["goals", "patient_id"],
      ]) {
        const rows = await db.query(table, { filter: { [field]: session.id } });
        if (Array.isArray(rows)) {
          for (const row of rows) await db.remove(table, { id: row.id });
        }
      }
      await db.remove("users", { id: session.id });
      await fetch(`${SUPA_URL}/auth/v1/user`, {
        method: "DELETE",
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${session.access_token}` },
      });
      onDeleted();
    } catch {
      setError("Erro ao excluir conta. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="delete-overlay" onClick={onClose}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-icon">⚠️</div>
        <div className="delete-title">Excluir conta</div>
        <div className="delete-desc">
          Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados serão apagados para sempre.
          <br /><br />
          Digite <strong>{KEYWORD}</strong> para confirmar:
        </div>
        <input className="delete-confirm-input" placeholder={KEYWORD} value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} autoFocus />
        {error && <p style={{ color: "#c0444a", fontSize: 13, marginBottom: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={handleDelete} disabled={confirm !== KEYWORD || loading}>
            {loading ? "Excluindo..." : "🗑 Excluir minha conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lógica de Som (Web Audio API) ────────────────────────────────────────────
// Gera um "Ding" suave e agradável nativamente no navegador
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine'; // Som suave
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.15, ctx.currentTime); // Volume (0.15 é baixinho e confortável)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Áudio não suportado no navegador", e);
  }
};

// ─── Therapist Layout ─────────────────────────────────────────────────────────
function TherapistLayout({ session, setSession, view, setView, modal, setModal }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [unread, setUnread] = useState(0);
  const [editingEx, setEditingEx] = useState(null);
  
  // Usamos o useRef para lembrar quantas notificações tínhamos na checagem anterior
  const prevUnreadRef = React.useRef(0); 

  useEffect(() => {
    let active = true;
    const fetchNotifs = async () => {
      try {
        const r = await db.query("notifications", { filter: { therapist_id: session.id, read: false } });
        if (active) {
          const currentCount = Array.isArray(r) ? r.length : 0;
          setUnread(currentCount);
          
          // Se o número atual for MAIOR que o anterior, significa que chegou mensagem nova! Toca o som.
          // (Apenas se prevUnreadRef não for a carga inicial de quando a página abriu)
          if (currentCount > prevUnreadRef.current && prevUnreadRef.current !== 0) {
            playNotificationSound();
          }
          
          // Atualiza a "memória" para a próxima checagem
          prevUnreadRef.current = currentCount;
        }
      } catch (e) {}
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [session.id]);

  const navItems = [
    { id: "dashboard", icon: "🏠", label: "Início" },
    { id: "patients", icon: "👥", label: "Pacientes" },
    { id: "exercises", icon: "📋", label: "Exercícios" },
    { id: "create", icon: "✏️", label: "Criar Exercício" },
    { id: "progress", icon: "📈", label: "Progresso" },
    { id: "responses", icon: "📊", label: "Respostas" },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src={LOGO} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} /> Equilibre
            </div>
            <button className="notif-bell" onClick={() => setView("notifications")} title="Notificações">
              🔔{unread > 0 && <span className="notif-dot">{unread > 9 ? "9+" : unread}</span>}
            </button>
          </div>
          <div className="role">Área da Psicóloga</div>
        </div>
        <nav>
          {navItems.map((n) => (
            <button key={n.id} className={`nav-item ${(view === n.id || (n.id === "create" && view === "edit")) ? "active" : ""}`} onClick={() => { setEditingEx(null); setView(n.id); }}>
              <span className="icon">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="avatar">{session.name[0]}</div>
            <div className="user-info">
              <div className="name">{session.name.split(" ")[0]}</div>
              <div className="email">{session.email}</div>
            </div>
            <div className="pill-actions">
              <button className="pill-btn" title="Sair" onClick={() => setShowLogout(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
              <button className="pill-btn delete" title="Excluir conta" onClick={() => setShowDelete(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        {view === "dashboard" && <TherapistDashboard session={session} setView={setView} />}
        {view === "patients" && <PatientsView session={session} setModal={setModal} />}
        {view === "exercises" && <ExercisesView session={session} />}
        {view === "create" && <CreateExerciseView session={session} onSaved={() => setView("exercises")} />}
        {view === "progress" && <TherapistProgress session={session} />}
        {view === "responses" && <ResponsesView session={session} />}
        {view === "notifications" && <NotificationsView session={session} onRead={() => { setUnread(0); prevUnreadRef.current = 0; }} />}
      </main>
      {modal && <Modal modal={modal} setModal={setModal} session={session} />}
      {showDelete && <DeleteAccountModal session={session} onClose={() => setShowDelete(false)} onDeleted={() => setSession(null)} />}
      
      {showLogout && (
        <div className="delete-overlay" onClick={() => setShowLogout(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon" style={{ fontSize: 42, marginBottom: 16 }}>👋</div>
            <div className="delete-title" style={{ fontSize: 20 }}>Encerrar sessão?</div>
            <div className="delete-desc" style={{ marginBottom: 24, fontSize: 14 }}>
              Tem certeza que deseja sair da sua conta?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setShowLogout(false)}>Cancelar</button>
              <button className="btn btn-sage" onClick={() => setSession(null)}>Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Therapist Dashboard ──────────────────────────────────────────────────────
function TherapistDashboard({ session, setView }) {
  const [stats, setStats] = useState({ patients: 0, done: 0, pending: 0, recent: [] });

  useEffect(() => {
    (async () => {
      const patients = await db.query("users", {
        select: "id,name,email",
        filter: { therapist_id: session.id, role: "patient" },
      });
      const pList = Array.isArray(patients) ? patients : [];
      const pIds = pList.map((p) => p.id);
      // Single batch query instead of N+1 loop — one request for all patients
      const allAssign = pIds.length > 0
        ? await db.query("assignments", { filterIn: { patient_id: pIds } }).then((r) => Array.isArray(r) ? r : [])
        : [];
      setStats({
        patients: pIds.length,
        done: allAssign.filter((a) => a.status === "done").length,
        pending: allAssign.filter((a) => a.status === "pending").length,
        recent: pList.slice(0, 4),
      });
    })();
  }, [session.id]);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Bem-vinda, {session.name.split(" ")[0]} 👋</h2>
        <p>Acompanhe o progresso dos seus pacientes</p>
      </div>
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-val">{stats.patients}</div><div className="stat-label">Pacientes ativos</div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-val">{stats.done}</div><div className="stat-label">Exercícios concluídos</div></div>
        <div className="stat-card"><div className="stat-icon">⏳</div><div className="stat-val">{stats.pending}</div><div className="stat-label">Pendentes</div></div>
      </div>
      <div className="card">
        <h3 style={{ fontSize: 17, marginBottom: 14 }}>Pacientes recentes</h3>
        {stats.recent.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Nenhum paciente ainda. Gere um código em <b>Pacientes</b>.
          </p>
        )}
        {stats.recent.map((p) => (
          <div key={p.id} className="patient-row">
            <div className="p-avatar">{p.name[0]}</div>
            <div>
              <div className="p-name">{p.name}</div>
              <div className="p-email">{p.email}</div>
            </div>
          </div>
        ))}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={() => setView("patients")}>Ver todos →</button>
      </div>
    </div>
  );
}

// ─── Patients View ────────────────────────────────────────────────────────────
function PatientsView({ session, setModal }) {
  const [patients, setPatients] = useState([]);
  const [invites, setInvites] = useState([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);

  // FIX: useCallback evita dependência desatualizada no useEffect
  const load = useCallback(async () => {
    const p = await db.query("users", {
      select: "id,name,email",
      filter: { therapist_id: session.id, role: "patient" },
    });
    const inv = await db.query("invites", {
      filter: { therapist_id: session.id },
      order: "created_at.desc",
    });
    setPatients(Array.isArray(p) ? p : []);
    setInvites(Array.isArray(inv) ? inv : []);
    setLoading(false);
  }, [session.id]);

  useEffect(() => {
    load();
  }, [load]);

  const generateCode = async () => {
    const code = (
      Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 5)
    ).toUpperCase().slice(0, 7);
    await db.insert("invites", {
      code,
      therapist_id: session.id,
      label: label.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    });
    setLabel("");
    load();
  };

  const revokeCode = async (code) => {
    await db.remove("invites", { code });
    load();
  };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Pacientes</h2>
        <p>Gere um código único para cada paciente</p>
      </div>

      <div className="card" style={{ marginBottom: 22, border: "1.5px solid var(--sage-light)" }}>
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>🔑 Gerar código de convite</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Cada código é único, pessoal e de uso único.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome do paciente (opcional)" style={{ flex: 1, minWidth: 180, padding: "10px 14px", border: "1.5px solid var(--warm)", borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 14, background: "var(--cream)", outline: "none" }} />
          <button className="btn btn-sage" onClick={generateCode}>+ Gerar código</button>
        </div>
      </div>

      {invites.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 10 }}>Códigos gerados</div>
          {invites.map((inv) => <InviteCodeCard key={inv.code} invite={inv} onRevoke={revokeCode} />)}
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Pacientes cadastrados ({patients.length})</h3>
        {loading && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</p>}
        {!loading && patients.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌱</div>
            <p>Nenhum paciente ainda.</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Gere um código acima e envie ao paciente.</p>
          </div>
        )}
        {patients.map((p) => (
          <div key={p.id} className="patient-row" onClick={() => setModal({ type: "assign", payload: { patient: p } })}>
            <div className="p-avatar">{p.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div className="p-name">{p.name}</div>
              <div className="p-email">{p.email}</div>
            </div>
            <button className="btn btn-accent btn-sm" onClick={(e) => { e.stopPropagation(); setModal({ type: "assign", payload: { patient: p } }); }}>+ Atribuir</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InviteCodeCard({ invite, onRevoke }) {
  const [copied, setCopied] = useState(false);
  const msg = `Olá! Sua psicóloga criou um acesso exclusivo para você no *Equilibre*.\n\n1. Acesse o site: https://equilibreapp.vercel.app/\n2. Clique em "Criar conta" → "Sou Paciente"\n3. Use o código: *${invite.code}*\n\n⚠️ Código pessoal e de uso único. 🌿`;
  const copy = () => {
    navigator.clipboard.writeText(invite.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");

  return (
    <div style={{ background: invite.status === "used" ? "#f0f0f0" : "var(--accent-soft)", border: `1.5px solid ${invite.status === "used" ? "#ddd" : "var(--accent)"}`, borderRadius: 12, padding: "13px 16px", marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, letterSpacing: ".18em", color: invite.status === "used" ? "#aaa" : "var(--accent)" }}>{invite.code}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {invite.status === "used"
              ? `✅ Utilizado em ${new Date(invite.used_at).toLocaleDateString("pt-BR")}`
              : "⏳ Aguardando cadastro"}
            {invite.label ? ` — ${invite.label}` : ""}
          </div>
        </div>
        {invite.status === "pending" && (
          <div style={{ display: "flex", gap: 7 }}>
            <button className="btn btn-sm" onClick={copy} style={{ background: copied ? "#d4edd9" : "white", color: copied ? "#2d7a3a" : "var(--accent)", border: "1.5px solid var(--accent)" }}>{copied ? "✓" : "Copiar"}</button>
            <button className="btn btn-sm btn-accent" onClick={whatsapp}>📲 WhatsApp</button>
            <button className="btn btn-sm" onClick={() => onRevoke(invite.code)} style={{ color: "var(--danger)", border: "1.5px solid var(--danger)", background: "white" }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Exercises View ───────────────────────────────────────────────────────────
function ExercisesView({ session }) {
  const [exercises, setExercises] = useState([]);
  const [editingEx, setEditingEx] = useState(null); // Controla tela de edição
  const [previewEx, setPreviewEx] = useState(null); // Controla a vista prévia
  const [refresh, setRefresh] = useState(0);
  const [deletingEx, setDeletingEx] = useState(null); // Controla o Modal de Exclusão

  useEffect(() => {
    db.query("exercises").then((r) => {
      const all = Array.isArray(r) ? r : [];
      setExercises(all.filter((ex) => !ex.therapist_id || ex.therapist_id === session.id));
    });
  }, [session.id, refresh]);

  const catClass = (c) => (c === "Mindfulness" ? "mindfulness" : c === "Bem-estar" ? "bem-estar" : "");

  const confirmDelete = async () => {
    if (!deletingEx) return;
    try {
      await db.remove("exercises", { id: deletingEx.id }, session.access_token);
      setRefresh(r => r + 1);
      setDeletingEx(null);
    } catch (err) {
      alert("Erro ao excluir exercício.");
    }
  };

  // ─── TELA DE EDIÇÃO ───
  if (editingEx) {
    return (
      <CreateExerciseView 
        key={editingEx.id} 
        session={session} 
        initialExercise={editingEx} 
        onSaved={() => {
          setEditingEx(null);
          setPreviewEx(null);
          setRefresh(r => r + 1);
        }} 
      />
    );
  }

  // ─── TELA DE VISTA PRÉVIA ───
  if (previewEx) {
    const qs = parseQuestions(previewEx);
    return (
      <div style={{ animation: "fadeUp .3s ease", maxWidth: 720 }}>
        <div className="page-header" style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 24 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setPreviewEx(null)}>← Voltar</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22 }}>Vista Prévia</h2>
          </div>
          <button className="btn btn-sage" onClick={() => { setEditingEx(previewEx); }}>
            ✏️ Editar Exercício
          </button>
        </div>

        <div className="card" style={{ marginBottom: 20, borderTop: "4px solid var(--sage-dark)" }}>
          <span className={`ex-cat ${catClass(previewEx.category)}`} style={{ marginBottom: 12 }}>{previewEx.category}</span>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, color: "var(--blue-dark)", marginBottom: 8 }}>
            {previewEx.title}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{previewEx.description}</p>
        </div>

        <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)", marginBottom: 12 }}>
          Perguntas cadastradas ({qs.length})
        </h4>

        {qs.map((q, i) => (
          <div key={i} className="card" style={{ marginBottom: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--sage)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
              {i + 1}. {q.type === 'instruction' ? '📢 Instrução' : q.type === 'scale' ? '🔢 Escala de 0 a 10' : q.type === 'reflect' ? '💭 Reflexão' : '📝 Resposta Aberta'}
            </div>
            <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.5 }}>
              {q.text}
            </div>
            {q.type === 'scale' && (
              <div style={{ display: "flex", gap: 5, marginTop: 12, opacity: 0.6 }}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{n}</div>)}
              </div>
            )}
            {(q.type === 'open' || q.type === 'reflect') && (
              <div style={{ width: "100%", height: 60, border: "1px dashed var(--warm)", borderRadius: 8, marginTop: 12, background: "var(--cream)" }} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ─── LISTA DE CARTÕES (BIBLIOTECA) ───
  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Biblioteca de Exercícios</h2>
        <p>Clique em um exercício para ver os detalhes, editar suas perguntas ou excluir.</p>
      </div>
      <div className="grid-auto">
        {exercises.map((ex) => {
          return (
            <div 
              key={ex.id} 
              className="ex-card" 
              style={{ position: "relative" }} 
              onClick={() => setPreviewEx(ex)} 
            >
              {/* Botões de Ação Rápida */}
              <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6 }}>
                <button
                  title="Editar"
                  onClick={(e) => { e.stopPropagation(); setEditingEx(ex); }}
                  style={{ background: "var(--cream)", border: "1px solid var(--warm)", borderRadius: 8, padding: "6px", cursor: "pointer", color: "var(--text-muted)", transition: "all .15s" }}
                  onMouseEnter={(e) => { e.target.style.borderColor = "var(--sage)"; e.target.style.color = "var(--sage-dark)"; }}
                  onMouseLeave={(e) => { e.target.style.borderColor = "var(--warm)"; e.target.style.color = "var(--text-muted)"; }}
                >
                  ✏️
                </button>
                <button
                  title="Excluir"
                  onClick={(e) => { e.stopPropagation(); setDeletingEx(ex); }}
                  style={{ background: "var(--cream)", border: "1px solid var(--danger)", borderRadius: 8, padding: "6px", cursor: "pointer", color: "var(--danger)", transition: "all .15s", opacity: 0.7 }}
                  onMouseEnter={(e) => e.target.style.opacity = "1"}
                  onMouseLeave={(e) => e.target.style.opacity = "0.7"}
                >
                  🗑️
                </button>
              </div>

              <span className={`ex-cat ${catClass(ex.category)}`}>{ex.category}</span>
              <div className="ex-title" style={{ paddingRight: 60 }}>{ex.title}</div>
              <div className="ex-desc">{ex.description}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
                📝 {parseQuestions(ex).length} perguntas
              </div>
            </div>
          );
        })}
        
        {exercises.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-icon">📭</div>
            <p>Nenhum exercício na biblioteca.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ─── */}
      {deletingEx && (
        <div className="delete-overlay" onClick={() => setDeletingEx(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon" style={{ fontSize: 42, marginBottom: 16 }}>🗑️</div>
            <div className="delete-title" style={{ fontSize: 20 }}>Excluir exercício?</div>
            <div className="delete-desc" style={{ marginBottom: 24, fontSize: 14 }}>
              Tem certeza que deseja excluir <strong>"{deletingEx.title}"</strong>?<br/><br/>
              Esta ação removerá o exercício da sua biblioteca e das tarefas pendentes dos seus pacientes. As respostas antigas ainda serão mantidas no histórico.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setDeletingEx(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Responses View ───────────────────────────────────────────────────────────
function ResponsesView({ session }) {
  const [patients, setPatients] = useState([]);
  const [responses, setResponses] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selPatient, setSelPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, ex] = await Promise.all([
        db.query("users", { select: "id,name", filter: { therapist_id: session.id, role: "patient" } }),
        db.query("exercises"),
      ]);
      const pList = Array.isArray(p) ? p : [];
      const pIds = pList.map((pt) => pt.id);
      // Single batch query instead of N+1 loop
      const allResp = pIds.length > 0
        ? await db.query("responses", { filterIn: { patient_id: pIds }, order: "completed_at.desc" }).then((r) => Array.isArray(r) ? r : [])
        : [];
      setPatients(pList);
      setExercises(Array.isArray(ex) ? ex : []);
      setResponses(allResp);
      setLoading(false);
    })();
  }, [session.id]);

  const filtered = selPatient ? responses.filter((r) => r.patient_id === selPatient.id) : responses;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header"><h2>Respostas dos Pacientes</h2></div>
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Filtrar</h3>
          <div style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer", background: !selPatient ? "rgba(122,158,135,0.12)" : "transparent", fontWeight: !selPatient ? 500 : 400, fontSize: 14 }} onClick={() => setSelPatient(null)}>Todos os pacientes</div>
          {patients.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 9, cursor: "pointer", background: selPatient?.id === p.id ? "rgba(122,158,135,0.12)" : "transparent" }} onClick={() => setSelPatient(p)}>
              <div className="p-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{p.name[0]}</div>
              <span style={{ fontSize: 13, fontWeight: selPatient?.id === p.id ? 500 : 400 }}>{p.name}</span>
            </div>
          ))}
        </div>
        <div>
          {loading && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</p>}
          {!loading && filtered.length === 0 && (
            <div className="empty-state"><div className="empty-icon">📭</div><p>Nenhuma resposta ainda.</p></div>
          )}
          {filtered.map((r) => {
            const patient = patients.find((p) => p.id === r.patient_id);
            const exercise = exercises.find((e) => e.id === r.exercise_id);
            const questions = exercise ? parseQuestions(exercise) : [];
            const answers = parseAnswers(r);
            return (
              <div key={r.id} className="card" style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16 }}>{exercise?.title || "Exercício"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{patient?.name} · {new Date(r.completed_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <span className="response-badge badge-done">✓ Concluído</span>
                </div>
                {answers.map((a, i) => {
                  const q = questions[i];
                  if (!q || q.type === "instruction" || !a) return null;
                  return (
                    <div key={i} className="response-item">
                      <div className="q-label">{q.text}</div>
                      <div className="q-answer">{a}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Modal (assign exercise) ──────────────────────────────────────────────────
function Modal({ modal, setModal, session }) {
  const [exercises, setExercises] = useState([]);
  const [existing, setExisting] = useState([]);
  const [selected, setSelected] = useState([]);
  const [dueDates, setDueDates] = useState({});
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [currentGoal, setCurrentGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modal.type !== "assign") return;
    (async () => {
      const ex = await db.query("exercises");
      const assign = await db.query("assignments", { filter: { patient_id: modal.payload.patient.id } });
      const goals = await db.query("goals", { filter: { patient_id: modal.payload.patient.id } });
      const filteredEx = (Array.isArray(ex) ? ex : []).filter(
        (e) => !e.therapist_id || e.therapist_id === session.id
      );
      setExercises(filteredEx);
      setExisting(Array.isArray(assign) ? assign : []);
      const g = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;
      setCurrentGoal(g);
      if (g) setWeeklyGoal(g.weekly_target);
      setLoading(false);
    })();
  }, [modal, session.id]);

  if (modal.type !== "assign") return null;

  const { patient } = modal.payload;
  const existingIds = existing.map((a) => a.exercise_id);
  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const getDueChip = (dueDate) => {
    if (!dueDate) return null;
    const days = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
    if (days < 0) return <span className="due-chip due-late">Atrasado</span>;
    if (days <= 2) return <span className="due-chip due-warn">Vence em {days}d</span>;
    return <span className="due-chip due-ok">📅 {new Date(dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>;
  };

  const assign = async () => {
    for (const exId of selected) {
      if (!existingIds.includes(exId)) {
        await db.insert("assignments", {
          id: "a" + Date.now() + Math.random().toString(36).slice(2, 6),
          patient_id: patient.id,
          exercise_id: exId,
          assigned_at: new Date().toISOString(),
          status: "pending",
          due_date: dueDates[exId] || null,
        });
      }
    }
    if (currentGoal) {
      await db.update("goals", { id: currentGoal.id }, { weekly_target: weeklyGoal });
    } else {
      await db.insert("goals", {
        id: "g" + Date.now(),
        patient_id: patient.id,
        therapist_id: session.id,
        weekly_target: weeklyGoal,
        created_at: new Date().toISOString(),
      });
    }
    setModal(null);
  };

  const removeAssign = async (exId) => {
    const a = existing.find((x) => x.exercise_id === exId);
    if (a) {
      await db.remove("assignments", { id: a.id });
      setExisting((ex) => ex.filter((x) => x.exercise_id !== exId));
    }
  };

  const inputSt = { padding: "6px 10px", border: "1.5px solid var(--warm)", borderRadius: 8, fontFamily: "DM Sans,sans-serif", fontSize: 12, background: "white", color: "var(--text)", outline: "none" };

  return (
    <div className="overlay" onClick={() => setModal(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Exercícios — {patient.name}</h3>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
        ) : (
          <>
            <div style={{ background: "var(--cream)", borderRadius: 12, padding: "12px 14px", marginBottom: 18, border: "1.5px solid var(--warm)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--blue-dark)", marginBottom: 8 }}>🎯 Meta semanal de exercícios</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min="1" max="10" value={weeklyGoal} onChange={(e) => setWeeklyGoal(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--blue-dark)" }} />
                <span style={{ fontWeight: 700, fontSize: 18, color: "var(--blue-dark)", minWidth: 22 }}>{weeklyGoal}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>por semana</span>
              </div>
            </div>

            {existingIds.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 8 }}>Atribuídos</div>
                {existing.map((a) => {
                  const ex = exercises.find((e) => e.id === a.exercise_id);
                  if (!ex) return null;
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--cream)", borderRadius: 10, marginBottom: 5, flexWrap: "wrap" }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{ex.title}</span>
                      {getDueChip(a.due_date)}
                      <span className={`response-badge ${a.status === "done" ? "badge-done" : "badge-pending"}`}>
                        {a.status === "done" ? "✓ Feito" : "⏳ Pendente"}
                      </span>
                      <button onClick={() => removeAssign(a.exercise_id)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 15 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-muted)", marginBottom: 8 }}>Adicionar</div>
            {exercises
              .filter((ex) => !existingIds.includes(ex.id))
              .map((ex) => (
                <div key={ex.id}>
                  <div className={`ex-pick ${selected.includes(ex.id) ? "selected" : ""}`} onClick={() => toggle(ex.id)} style={{ marginBottom: selected.includes(ex.id) ? 4 : 7 }}>
                    <div className="check">{selected.includes(ex.id) ? "✓" : ""}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{ex.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{ex.category}</div>
                    </div>
                  </div>
                  {selected.includes(ex.id) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, paddingLeft: 8 }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>📅 Prazo:</span>
                      <input type="date" style={inputSt} value={dueDates[ex.id] || ""} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDueDates((d) => ({ ...d, [ex.id]: e.target.value }))} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(opcional)</span>
                    </div>
                  )}
                </div>
              ))}

            <div style={{ display: "flex", gap: 9, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Fechar</button>
              <button className="btn btn-sage" onClick={assign}>
                {selected.length > 0 ? `Atribuir ${selected.length} + salvar meta` : "Salvar meta"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Create / Edit Exercise View ──────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: "open", label: "📝 Resposta aberta" },
  { value: "scale", label: "🔢 Escala 0–10" },
  { value: "reflect", label: "💭 Reflexão (opcional)" },
  { value: "instruction", label: "📢 Instrução (sem resposta)" },
];
const CATEGORIES = ["Ansiedade", "Bem-estar", "Mindfulness", "Autoconhecimento", "Relacionamentos", "Outro"];

function makeEmptyQuestion() {
  return { id: "q" + Date.now() + Math.random().toString(36).slice(2, 5), type: "open", text: "" };
}

function CreateExerciseView({ session, onSaved, initialExercise }) {
  const isEditing = !!initialExercise;

  const [form, setForm] = useState(() => {
    if (isEditing) return { title: initialExercise.title, category: initialExercise.category || "Ansiedade", description: initialExercise.description };
    return { title: "", category: "Ansiedade", description: "" };
  });

  const [questions, setQuestions] = useState(() => {
    if (isEditing) return parseQuestions(initialExercise);
    return [makeEmptyQuestion()];
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const addQ = () => setQuestions((qs) => [...qs, makeEmptyQuestion()]);
  const removeQ = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const updateQ = (i, field, val) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, [field]: val } : q)));
  const moveQ = (i, dir) => {
    setQuestions((qs) => {
      const arr = [...qs];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const save = async () => {
    if (!form.title.trim()) { setError("Informe o título do exercício."); return; }
    if (!form.description.trim()) { setError("Informe a descrição."); return; }
    if (questions.some((q) => !q.text.trim())) { setError("Todas as perguntas/instruções precisam ter texto."); return; }
    setError("");
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        questions: JSON.stringify(questions),
      };

      if (isEditing) {
        await db.update("exercises", { id: initialExercise.id }, payload, session.access_token);
      } else {
        await db.insert("exercises", {
          id: "ex" + Date.now(),
          therapist_id: session.id,
          ...payload
        }, session.access_token);
      }
      
      setSuccess(isEditing ? "Exercício atualizado com sucesso!" : "Exercício criado com sucesso!");
      setTimeout(() => { setSuccess(""); onSaved(); }, 1500);
    } catch (err) {
      setError("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { width: "100%", padding: "11px 14px", border: "1.5px solid var(--warm)", borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 15, background: "var(--cream)", color: "var(--text)", outline: "none" };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" };

  return (
    <div style={{ animation: "fadeUp .4s ease", maxWidth: 720 }}>
      <div className="page-header">
        <h2>{isEditing ? "✏️ Editar Exercício" : "✏️ Criar Exercício"}</h2>
        <p>{isEditing ? "Modifique as informações do exercício selecionado" : "Monte um exercício personalizado para seus pacientes"}</p>
      </div>

      {success && <div className="success-banner">✅ {success}</div>}
      {error && <p className="error-msg">{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, color: "var(--blue-dark)" }}>Informações gerais</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Título do exercício</label>
          <input style={fieldStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Diário das Emoções" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Categoria</label>
            <select style={{ ...fieldStyle, cursor: "pointer" }} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Descrição breve</label>
          <textarea style={{ ...fieldStyle, minHeight: 70, resize: "vertical" }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="O que este exercício trabalha?" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: "var(--blue-dark)" }}>Perguntas ({questions.length})</h3>
          <button className="btn btn-sage btn-sm" onClick={addQ}>+ Adicionar pergunta</button>
        </div>
        
        {isEditing && (
          <div style={{ padding: "10px 14px", background: "rgba(246, 148, 59, 0.1)", borderRadius: 10, marginBottom: 16, fontSize: 12, color: "var(--accent)", border: "1px solid var(--accent)" }}>
            ⚠️ <strong>Atenção:</strong> Se você excluir ou reordenar perguntas de um exercício que já foi respondido por pacientes, as respostas antigas podem ficar desalinhadas no histórico.
          </div>
        )}

        {questions.map((q, i) => (
          <div key={q.id} style={{ background: "var(--cream)", borderRadius: 14, padding: "16px 16px 12px", marginBottom: 12, border: "1.5px solid var(--warm)", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
              <span style={{ background: "var(--blue-dark)", color: "white", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <select style={{ flex: 1, padding: "7px 10px", border: "1.5px solid var(--warm)", borderRadius: 8, fontFamily: "DM Sans, sans-serif", fontSize: 13, background: "white", color: "var(--text)", cursor: "pointer", outline: "none" }} value={q.type} onChange={(e) => updateQ(i, "type", e.target.value)}>
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button onClick={() => moveQ(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "not-allowed" : "pointer", opacity: i === 0 ? 0.3 : 1, fontSize: 16, padding: "2px 4px" }}>↑</button>
              <button onClick={() => moveQ(i, 1)} disabled={i === questions.length - 1} style={{ background: "none", border: "none", cursor: i === questions.length - 1 ? "not-allowed" : "pointer", opacity: i === questions.length - 1 ? 0.3 : 1, fontSize: 16, padding: "2px 4px" }}>↓</button>
              <button onClick={() => removeQ(i)} disabled={questions.length === 1} style={{ background: "none", border: "none", cursor: questions.length === 1 ? "not-allowed" : "pointer", color: "var(--danger)", fontSize: 16, opacity: questions.length === 1 ? 0.3 : 1, padding: "2px 4px" }}>✕</button>
            </div>
            <textarea style={{ width: "100%", minHeight: 70, padding: "10px 12px", border: "1.5px solid var(--warm)", borderRadius: 10, fontFamily: "DM Sans, sans-serif", fontSize: 14, background: "white", color: "var(--text)", resize: "vertical", outline: "none" }} placeholder={q.type === "instruction" ? "Escreva a instrução ou orientação para o paciente..." : "Escreva a pergunta..."} value={q.text} onChange={(e) => updateQ(i, "text", e.target.value)} />
            {q.type === "instruction" && <div style={{ fontSize: 11, color: "var(--blue-dark)", marginTop: 5 }}>💡 Instrução — o paciente lerá mas não precisa responder.</div>}
            {q.type === "reflect" && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>💭 Reflexão — campo de texto livre, preenchimento opcional.</div>}
            {q.type === "scale" && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>🔢 Escala — o paciente escolherá um valor de 0 a 10.</div>}
          </div>
        ))}

        <button className="btn btn-outline" style={{ width: "100%", marginTop: 6, borderStyle: "dashed" }} onClick={addQ}>+ Adicionar outra pergunta</button>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button className="btn btn-outline" onClick={onSaved}>Cancelar</button>
        <button className="btn btn-sage" style={{ padding: "11px 28px" }} onClick={save} disabled={saving}>
          {saving ? "Salvando..." : isEditing ? "💾 Atualizar exercício" : "💾 Salvar exercício"}
        </button>
      </div>
    </div>
  );
}

// ─── Mini SVG Line Chart ──────────────────────────────────────────────────────
function MiniLineChart({ points, color = "var(--blue-dark)", height = 70, labels }) {
  if (!points || points.length < 2)
    return <div style={{ textAlign: "center", padding: "18px 0", color: "var(--text-muted)", fontSize: 12 }}>Dados insuficientes para gráfico</div>;

  const vals = points.map(Number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 280;
  const H = height;
  const toX = (i) => (i / (vals.length - 1)) * (W - 24) + 12;
  const toY = (v) => H - 10 - ((v - min) / range) * (H - 22);
  const polyPts = vals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const fillPts = `${toX(0)},${H} ` + vals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ") + ` ${toX(vals.length - 1)},${H}`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill="url(#cg)" />
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {vals.map((v, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(v)} r="4.5" fill="white" stroke={color} strokeWidth="2" />
            <text x={toX(i)} y={toY(v) - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">{v}</text>
          </g>
        ))}
      </svg>
      {labels && (
        <div className="chart-label-row">
          {labels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Weekly Goal Bar ──────────────────────────────────────────────────────────
function WeekGoalBar({ done, target }) {
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const color = pct >= 100 ? "#2d7a3a" : pct >= 50 ? "var(--blue-dark)" : "var(--accent)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
        <span>Meta semanal</span>
        <span style={{ fontWeight: 600, color }}>{done}/{target} exercícios</span>
      </div>
      <div className="goal-bar-bg">
        <div className="goal-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? "#2d7a3a" : undefined }} />
      </div>
      <div style={{ fontSize: 11, color, textAlign: "right" }}>{pct >= 100 ? "🎉 Meta atingida!" : `${pct}% concluído`}</div>
    </div>
  );
}

// ─── Therapist Progress View ──────────────────────────────────────────────────
function TherapistProgress({ session }) {
  const [patients, setPatients] = useState([]);
  const [selPat, setSelPat] = useState(null);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.query("users", { select: "id,name", filter: { therapist_id: session.id, role: "patient" } }).then((r) => {
      const p = Array.isArray(r) ? r : [];
      setPatients(p);
      if (p.length) setSelPat(p[0]);
      setLoading(false);
    });
  }, [session.id]);

  useEffect(() => {
    if (!selPat) return;
    (async () => {
      const responses = await db.query("responses", { filter: { patient_id: selPat.id }, order: "completed_at.asc" });
      const exercises = await db.query("exercises");
      const goals = await db.query("goals", { filter: { patient_id: selPat.id } });
      const exList = Array.isArray(exercises) ? exercises : [];
      const rList = Array.isArray(responses) ? responses : [];
      const goal = Array.isArray(goals) && goals.length > 0 ? goals[0].weekly_target : null;

      const parsed = rList.map((r) => {
        const ex = exList.find((e) => e.id === r.exercise_id);
        const qs = ex ? parseQuestions(ex) : [];
        const ans = parseAnswers(r);
        const scaleAnswers = qs.reduce((acc, q, i) => {
          if (q.type === "scale" && ans[i] !== "" && ans[i] !== undefined)
            acc.push({ label: q.text.slice(0, 25) + "…", val: Number(ans[i]) });
          return acc;
        }, []);
        return { date: new Date(r.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), ex: ex?.title || "", scaleAnswers, completedAt: r.completed_at };
      });

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const doneThisWeek = rList.filter((r) => new Date(r.completed_at) >= startOfWeek).length;

      setChartData({ responses: parsed, doneThisWeek, weeklyTarget: goal, totalDone: rList.length });
    })();
  }, [selPat]);

  if (loading) return <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</div>;

  const scalePoints = chartData.responses?.filter((r) => r.scaleAnswers?.length > 0).map((r) => ({
    date: r.date,
    avg: Math.round((r.scaleAnswers.reduce((s, a) => s + a.val, 0) / r.scaleAnswers.length) * 10) / 10,
  }));

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header"><h2>📈 Progresso dos Pacientes</h2><p>Acompanhe a evolução das respostas ao longo do tempo</p></div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        {patients.map((p) => (
          <button key={p.id} onClick={() => setSelPat(p)} style={{ padding: "8px 16px", borderRadius: 20, border: `2px solid ${selPat?.id === p.id ? "var(--blue-dark)" : "var(--warm)"}`, background: selPat?.id === p.id ? "rgba(23,82,124,0.07)" : "white", cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontSize: 13, fontWeight: selPat?.id === p.id ? 600 : 400, color: selPat?.id === p.id ? "var(--blue-dark)" : "var(--text-muted)" }}>
            {p.name.split(" ")[0]}
          </button>
        ))}
        {patients.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Nenhum paciente ainda.</p>}
      </div>

      {selPat && chartData.responses && (
        <div>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-val">{chartData.totalDone}</div><div className="stat-label">Exercícios concluídos</div></div>
            <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-val">{chartData.doneThisWeek}</div><div className="stat-label">Essa semana</div></div>
            <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-val">{chartData.weeklyTarget ?? "—"}</div><div className="stat-label">Meta semanal</div></div>
          </div>

          {chartData.weeklyTarget && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Meta semanal — {selPat.name.split(" ")[0]}</h3>
              <WeekGoalBar done={chartData.doneThisWeek} target={chartData.weeklyTarget} />
            </div>
          )}

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Evolução das respostas de escala</h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Média das escalas (0–10) por exercício respondido</p>
            {scalePoints && scalePoints.length >= 2 ? (
              <MiniLineChart points={scalePoints.map((p) => p.avg)} labels={scalePoints.map((p) => p.date)} height={100} />
            ) : (
              <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-icon">📊</div><p style={{ fontSize: 13 }}>Aguardando respostas com escala para gerar gráfico.</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications View ───────────────────────────────────────────────────────
function NotificationsView({ session, onRead }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const n = await db.query("notifications", { filter: { therapist_id: session.id }, order: "created_at.desc" });
      const list = Array.isArray(n) ? n : [];
      setNotifs(list);
      for (const notif of list.filter((x) => !x.read)) {
        await db.update("notifications", { id: notif.id }, { read: true });
      }
      onRead();
      setLoading(false);
    })();
  }, [session.id]);

  return (
    <div style={{ animation: "fadeUp .4s ease", maxWidth: 600 }}>
      <div className="page-header"><h2>🔔 Notificações</h2><p>Atividades recentes dos seus pacientes</p></div>
      {loading && <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</p>}
      {!loading && notifs.length === 0 && <div className="empty-state"><div className="empty-icon">🔕</div><p>Nenhuma notificação ainda.</p></div>}
      {notifs.map((n) => (
        <div key={n.id} className="card" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 14, opacity: n.read ? 0.65 : 1 }}>
          <div style={{ fontSize: 28 }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}><strong>{n.patient_name}</strong> concluiu <em>{n.exercise_title}</em></div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          {!n.read && <span className="response-badge" style={{ background: "rgba(23,82,124,0.1)", color: "var(--blue-dark)" }}>Novo</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Patient Layout ───────────────────────────────────────────────────────────
function PatientLayout({ session, setSession, view, setView }) {
  const [showDelete, setShowDelete] = useState(false);
  const [showLogout, setShowLogout] = useState(false); // <-- NOVO ESTADO
  const [activeExercise, setActiveExercise] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.query("users", { filter: { email: session.email } });
        if (!cancelled && Array.isArray(rows) && rows.length > 0 && rows[0].id !== session.id) {
          setSession((prev) => ({ ...prev, ...rows[0] }));
        }
      } catch { /* non-critical */ }
    })();
    return () => { cancelled = true; };
  }, [session.email]);

  useEffect(() => {
    let active = true;
    const fetchPending = async () => {
      try {
        const r = await db.query("assignments", { filter: { patient_id: session.id, status: "pending" } });
        if (active) setPendingCount(Array.isArray(r) ? r.length : 0);
      } catch { /* ignore */ }
    };
    fetchPending();
    const intId = setInterval(fetchPending, 5000);
    return () => { active = false; clearInterval(intId); };
  }, [session.id]);

  if (activeExercise)
    return (
      <ExercisePage
        exercise={activeExercise}
        session={session}
        onBack={() => { setActiveExercise(null); setView("exercises"); }}
      />
    );

  const patNav = [
    { id: "home", icon: "🏠", label: "Início" },
    { id: "exercises", icon: "📋", label: "Meus Exercícios" },
    { id: "diary", icon: "📓", label: "Diário" },
    { id: "progress", icon: "📊", label: "Meu Progresso" },
    { id: "history", icon: "📖", label: "Histórico" },
  ];

  return (
    <div className="layout">
      <aside className="sidebar patient-sidebar">
        <div className="sidebar-header">
          <div className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={LOGO} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} /> Equilibre
          </div>
          <div className="role">Área do Paciente</div>
        </div>
        <nav>
          {patNav.map((n) => (
            <button key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
              <span className="icon">{n.icon}</span>{n.label}
              {n.id === "exercises" && pendingCount > 0 && (
                <span style={{ marginLeft: "auto", background: "var(--accent)", color: "white", borderRadius: 20, fontSize: 10, padding: "2px 7px" }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="avatar">{session.name[0]}</div>
            <div className="user-info">
              <div className="name">{session.name.split(" ")[0]}</div>
              <div className="email">{session.email}</div>
            </div>
            <div className="pill-actions">
              {/* Abre o modal de logout */}
              <button className="pill-btn" title="Sair" onClick={() => setShowLogout(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
              <button className="pill-btn delete" title="Excluir conta" onClick={() => setShowDelete(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        {view === "home" && <PatientHome session={session} setView={setView} />}
        {view === "exercises" && <PatientExercises session={session} setActiveExercise={setActiveExercise} />}
        {view === "diary" && <PatientDiary session={session} />}
        {view === "progress" && <PatientProgress session={session} />}
        {view === "history" && <PatientHistory session={session} />}
      </main>
      {showDelete && <DeleteAccountModal session={session} onClose={() => setShowDelete(false)} onDeleted={() => setSession(null)} />}
      
      {/* MODAL DE CONFIRMAÇÃO DE LOGOUT */}
      {showLogout && (
        <div className="delete-overlay" onClick={() => setShowLogout(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon" style={{ fontSize: 42, marginBottom: 16 }}>👋</div>
            <div className="delete-title" style={{ fontSize: 20 }}>Encerrar sessão?</div>
            <div className="delete-desc" style={{ marginBottom: 24, fontSize: 14 }}>
              Tem certeza que deseja sair da sua conta?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setShowLogout(false)}>Cancelar</button>
              <button className="btn btn-sage" onClick={() => setSession(null)}>Sair</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Patient Home ─────────────────────────────────────────────────────────────
function PatientHome({ session, setView }) {
  const [counts, setCounts] = useState({ pending: 0, done: 0 });
  const [goal, setGoal] = useState(null);
  const [doneThisWeek, setDoneThisWeek] = useState(0);
  const [overdue, setOverdue] = useState(0);

  useEffect(() => {
    let active = true;

    const fetch = async () => {
      const [pending, done, goals, responses] = await Promise.all([
        db.query("assignments", { filter: { patient_id: session.id, status: "pending" } }),
        db.query("assignments", { filter: { patient_id: session.id, status: "done" } }),
        db.query("goals", { filter: { patient_id: session.id } }),
        db.query("responses", { filter: { patient_id: session.id }, order: "completed_at.desc" }),
      ]);

      if (!active) return;

      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const respList = Array.isArray(responses) ? responses : [];
      const pendList = Array.isArray(pending) ? pending : [];
      const weekDone = respList.filter((r) => new Date(r.completed_at) >= startOfWeek).length;
      const od = pendList.filter((a) => a.due_date && new Date(a.due_date) < now).length;

      setCounts({ pending: pendList.length, done: Array.isArray(done) ? done.length : 0 });
      const g = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;
      setGoal(g);
      setDoneThisWeek(weekDone);
      setOverdue(od);
    };

    fetch();
    const intId = setInterval(fetch, 5000);
    return () => { active = false; clearInterval(intId); };
  }, [session.id]);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header">
        <h2>Olá, {session.name.split(" ")[0]} 🌱</h2>
        <p>Como você está se sentindo hoje?</p>
      </div>
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon">⏳</div><div className="stat-val">{counts.pending}</div><div className="stat-label">Para fazer</div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-val">{counts.done}</div><div className="stat-label">Concluídos</div></div>
        {overdue > 0
          ? <div className="stat-card" style={{ border: "1.5px solid #f6943b" }}><div className="stat-icon">⚠️</div><div className="stat-val" style={{ color: "var(--accent)" }}>{overdue}</div><div className="stat-label">Com prazo vencido</div></div>
          : <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-val" style={{ fontSize: 22 }}>OK</div><div className="stat-label">Prazos em dia</div></div>}
      </div>

      {goal && (
        <div className="card" style={{ marginBottom: 18 }}>
          <WeekGoalBar done={doneThisWeek} target={goal.weekly_target} />
        </div>
      )}

      {counts.pending > 0
        ? <div className="card" style={{ background: "linear-gradient(135deg,var(--blue-dark),var(--blue-mid))", color: "white", cursor: "pointer" }} onClick={() => setView("exercises")}>
            <div style={{ fontSize: 22, marginBottom: 7 }}>📋</div>
            <h3 style={{ fontSize: 17, marginBottom: 5 }}>Você tem {counts.pending} exercício{counts.pending > 1 ? "s" : ""} pendente{counts.pending > 1 ? "s" : ""}!</h3>
            <p style={{ opacity: 0.85, fontSize: 13 }}>Clique aqui para começar quando estiver pronto(a).</p>
          </div>
        : <div className="card"><div className="empty-state"><div className="empty-icon">🎉</div><p>Você está em dia com seus exercícios!</p></div></div>}
    </div>
  );
}

// ─── Patient Exercises ────────────────────────────────────────────────────────
// FIX: ExCard definido FORA do componente pai, recebe props explícitas
function ExCard({ assign, isDone, exercises, onStart }) {
  const ex = exercises.find((e) => e.id === assign.exercise_id);
  if (!ex) return null;
  const qs = parseQuestions(ex);

  return (
    <div className="ex-card" style={{ opacity: isDone ? 0.6 : 1 }} onClick={() => !isDone && onStart({ ...ex, questions: qs })}>
      <span className="ex-cat">{ex.category}</span>
      <div className="ex-title">{ex.title}</div>
      <div className="ex-desc">{ex.description}</div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📝 {qs.length} perguntas</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isDone && assign.due_date && (() => {
            const days = Math.ceil((new Date(assign.due_date) - new Date()) / 86400000);
            if (days < 0) return <span className="due-chip due-late">Prazo vencido</span>;
            if (days <= 2) return <span className="due-chip due-warn">Vence em {days}d</span>;
            return <span className="due-chip due-ok">📅 {new Date(assign.due_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>;
          })()}
          {isDone
            ? <span className="response-badge badge-done">✓ Concluído</span>
            : <button className="btn btn-sage btn-sm">Começar →</button>}
        </div>
      </div>
    </div>
  );
}

function PatientExercises({ session, setActiveExercise }) {
  const [assignments, setAssignments] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let firstLoad = true;

    const fetchAssignments = async () => {
      // With FK in DB: assignments?select=*,exercises(*) returns nested exercise
      // data in one round-trip. Falls back gracefully if FK is missing.
      let assignments_raw = [];
      let exercises_raw = [];
      try {
        const nested = await db.query("assignments", {
          select: "*,exercises(*)",
          filter: { patient_id: session.id },
        });
        if (Array.isArray(nested) && nested.length > 0 && nested[0].exercises) {
          // Nested join worked — extract exercises from the embedded data
          assignments_raw = nested;
          exercises_raw = nested.map((a) => a.exercises).filter(Boolean);
        } else {
          // FK not set up yet — fall back to two separate queries
          const [a, ex] = await Promise.all([
            db.query("assignments", { filter: { patient_id: session.id } }),
            db.query("exercises"),
          ]);
          assignments_raw = Array.isArray(a) ? a : [];
          exercises_raw = Array.isArray(ex) ? ex : [];
        }
      } catch {
        // Last resort fallback
        const [a, ex] = await Promise.all([
          db.query("assignments", { filter: { patient_id: session.id } }),
          db.query("exercises"),
        ]);
        assignments_raw = Array.isArray(a) ? a : [];
        exercises_raw = Array.isArray(ex) ? ex : [];
      }
      if (!active) return;
      setAssignments(assignments_raw);
      // Deduplicate exercises (nested join may produce duplicates)
      const seen = new Set();
      setExercises(exercises_raw.filter((e) => e && !seen.has(e.id) && seen.add(e.id)));
      if (firstLoad) { setLoading(false); firstLoad = false; }
    };

    fetchAssignments();
    const intId = setInterval(fetchAssignments, 5000);
    return () => { active = false; clearInterval(intId); };
  }, [session.id]);

  const pending = assignments.filter((a) => a.status === "pending");
  const done = assignments.filter((a) => a.status === "done");

  if (loading) return <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</div>;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header"><h2>Meus Exercícios</h2></div>
      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 11 }}>Para fazer</div>
          <div className="grid-auto" style={{ marginBottom: 28 }}>
            {pending.map((a) => <ExCard key={a.id} assign={a} isDone={false} exercises={exercises} onStart={setActiveExercise} />)}
          </div>
        </>
      )}
      {done.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--text-muted)", marginBottom: 11 }}>Concluídos</div>
          <div className="grid-auto">
            {done.map((a) => <ExCard key={a.id} assign={a} isDone={true} exercises={exercises} onStart={setActiveExercise} />)}
          </div>
        </>
      )}
      {assignments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>Nenhum exercício atribuído ainda.</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Aguarde sua psicóloga enviar exercícios para você.</p>
        </div>
      )}
    </div>
  );
}

// ─── Patient History ──────────────────────────────────────────────────────────
function PatientHistory({ session }) {
  const [responses, setResponses] = useState([]);
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    (async () => {
      const [r, ex] = await Promise.all([
        db.query("responses", { filter: { patient_id: session.id }, order: "completed_at.desc" }),
        db.query("exercises"),
      ]);
      setResponses(Array.isArray(r) ? r : []);
      setExercises(Array.isArray(ex) ? ex : []);
    })();
  }, [session.id]);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header"><h2>Meu Histórico</h2></div>
      {responses.length === 0 && <div className="empty-state"><div className="empty-icon">📭</div><p>Nenhum exercício concluído ainda.</p></div>}
      {responses.map((r) => {
        const ex = exercises.find((e) => e.id === r.exercise_id);
        const questions = ex ? parseQuestions(ex) : [];
        const answers = parseAnswers(r);
        return (
          <div key={r.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 17, marginBottom: 3 }}>{ex?.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 14 }}>{new Date(r.completed_at).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
            {answers.map((a, i) => {
              const q = questions[i];
              if (!q || q.type === "instruction" || !a) return null;
              return (
                <div key={i} className="response-item">
                  <div className="q-label">{q.text}</div>
                  <div className="q-answer">{a}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Patient Diary ────────────────────────────────────────────────────────────
const MOODS = [
  { val: 1, emoji: "😔", label: "Difícil" },
  { val: 2, emoji: "😕", label: "Baixo" },
  { val: 3, emoji: "😐", label: "Neutro" },
  { val: 4, emoji: "🙂", label: "Bem" },
  { val: 5, emoji: "😄", label: "Ótimo" },
];

function PatientDiary({ session }) {
  const getLocalToday = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
  };
  const today = getLocalToday();

  const [entries, setEntries] = useState([]);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState(false);

  // Estados para o formulário (Criação e Edição)
  const [editingEntry, setEditingEntry] = useState(null);
  const [mood, setMood] = useState(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado para o modal de exclusão
  const [deletingEntry, setDeletingEntry] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [e, u] = await Promise.all([
          db.query("diary_entries", { filter: { patient_id: session.id }, order: "date.desc" }),
          db.query("users", { filter: { id: session.id } }),
        ]);
        const list = Array.isArray(e) ? e : [];
        setEntries(list);
        
        const te = list.find((x) => x.date === today);
        if (te) setTodayEntry(te);
    
        if (Array.isArray(u) && u.length) setReminder(!!u[0].reminder_email);
      } catch (err) {
        console.error("Erro ao carregar diário:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [session.id, today]);

  const save = async () => {
    setSaving(true);
    try {
      if (editingEntry) {
        // Atualizando um registro existente
        await db.update("diary_entries", { id: editingEntry.id }, { mood, text, updated_at: new Date().toISOString() });
        setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, mood, text } : e));
        
        // Se estivermos editando o registro de hoje, atualiza a referência dele
        if (editingEntry.date === today) {
          setTodayEntry(prev => ({ ...prev, mood, text }));
        }
        setEditingEntry(null); // Fecha o editor
      } else {
        // Criando o registro de hoje
        const entry = { id: "d" + Date.now(), patient_id: session.id, date: today, mood, text, created_at: new Date().toISOString() };
        await db.insert("diary_entries", entry);
        setTodayEntry(entry);
        setEntries((prev) => [entry, ...prev]);
      }
      // Limpa os campos do formulário
      setMood(null);
      setText("");
    } catch (e) {
      alert("Erro ao salvar diário. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entry) => {
    setEditingEntry(entry);
    setMood(entry.mood);
    setText(entry.text || "");
    window.scrollTo({ top: 0, behavior: "smooth" }); // Rola para cima para o paciente ver o formulário
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setMood(null);
    setText("");
  };

  const confirmDelete = async () => {
    if (!deletingEntry) return;
    try {
      await db.remove("diary_entries", { id: deletingEntry.id });
      setEntries(prev => prev.filter(e => e.id !== deletingEntry.id));
      
      // Se apagou o de hoje, limpa o state para o quadro de criação voltar a aparecer
      if (deletingEntry.date === today) {
        setTodayEntry(null);
      }
      // Se estava editando o que acabou de apagar, fecha o editor
      if (editingEntry?.id === deletingEntry.id) {
        cancelEdit();
      }
      setDeletingEntry(null);
    } catch (e) {
      alert("Erro ao excluir registro.");
    }
  };

  const toggleReminder = async () => {
    const newVal = !reminder;
    setReminder(newVal);
    try { await db.update("users", { id: session.id }, { reminder_email: newVal }); } catch(e) {}
  };

  if (loading) return <div style={{ color: "var(--text-muted)", padding: 20 }}>Carregando diário...</div>;

  // Só mostra o formulário se o paciente ainda não tiver preenchido hoje OU se ele clicou em "Editar"
  const showForm = !todayEntry || editingEntry;

  return (
    <div style={{ animation: "fadeUp .4s ease", maxWidth: 640 }}>
      <div className="page-header"><h2>📓 Diário Emocional</h2><p>Registre como você está se sentindo a cada dia</p></div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="toggle-row">
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>⏰ Lembrete diário por e-mail</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Receba um e-mail todo dia às 20h para registrar seu humor</div>
          </div>
          <button className={`toggle ${reminder ? "on" : "off"}`} onClick={toggleReminder} />
        </div>
      </div>

      {/* ─── QUADRO DE CRIAÇÃO / EDIÇÃO ─── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, border: editingEntry ? "1.5px solid var(--orange)" : "1.5px solid var(--blue-mid)", animation: "fadeIn .3s ease" }}>
          <h3 style={{ fontSize: 15, marginBottom: 14, color: editingEntry ? "var(--orange)" : "var(--blue-dark)" }}>
            {editingEntry 
              ? `Editando registro de ${new Date(editingEntry.date + "T12:00:00").toLocaleDateString("pt-BR")}` 
              : "Como você está hoje?"}
          </h3>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 18 }}>
            {MOODS.map((m) => (
              <div key={m.val} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setMood(m.val)}>
                <button className={`mood-btn ${mood === m.val ? "sel" : ""}`}>{m.emoji}</button>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <textarea className="q-textarea" placeholder="Como foi seu dia? O que você está sentindo? (opcional)" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 90 }} />
          
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {editingEntry && (
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelEdit}>
                Cancelar
              </button>
            )}
            <button className="btn btn-sage" style={{ flex: 2 }} onClick={save} disabled={!mood || saving}>
              {saving ? "Salvando..." : editingEntry ? "Atualizar registro" : "💾 Salvar meu dia"}
            </button>
          </div>
        </div>
      )}

      {/* ─── HISTÓRICO DE REGISTROS ─── */}
      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Seu Histórico</h3>
      
      {entries.map((e) => {
        const m = MOODS.find((x) => x.val === e.mood);
        const isToday = e.date === today;
        return (
          <div key={e.id} className="card" style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start", border: isToday ? "1.5px solid var(--sage-light)" : "1px solid rgba(255,255,255,0.6)" }}>
            <div style={{ fontSize: 28 }}>{m?.emoji || "😐"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>
                  {m?.label} 
                  {isToday && <span style={{fontSize: 9, background: "var(--sage-light)", color: "var(--sage-dark)", padding: "3px 8px", borderRadius: 10, marginLeft: 8, fontWeight: 700, letterSpacing: ".05em"}}>HOJE</span>}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </span>
              </div>
              {e.text && <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{e.text}</p>}
              
              {/* Botões de Ação do Histórico */}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button 
                  onClick={() => startEdit(e)} 
                  style={{ background: "transparent", border: "1px solid var(--warm)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--text-muted)", fontSize: 11, fontWeight: 500, transition: "all .15s" }}
                  onMouseEnter={(ev) => ev.target.style.borderColor = "var(--sage)"}
                  onMouseLeave={(ev) => ev.target.style.borderColor = "var(--warm)"}
                >
                  ✏️ Editar
                </button>
                <button 
                  onClick={() => setDeletingEntry(e)} 
                  style={{ background: "transparent", border: "1px solid var(--warm)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: "var(--danger)", fontSize: 11, fontWeight: 500, transition: "all .15s", opacity: 0.7 }}
                  onMouseEnter={(ev) => { ev.target.style.borderColor = "var(--danger)"; ev.target.style.opacity = "1"; }}
                  onMouseLeave={(ev) => { ev.target.style.borderColor = "var(--warm)"; ev.target.style.opacity = "0.7"; }}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {entries.length === 0 && (
        <div className="empty-state"><div className="empty-icon">📖</div><p>Nenhum registro ainda. Comece hoje!</p></div>
      )}

      {/* ─── MODAL DE EXCLUSÃO ─── */}
      {deletingEntry && (
        <div className="delete-overlay" onClick={() => setDeletingEntry(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon" style={{ fontSize: 42, marginBottom: 16 }}>🗑️</div>
            <div className="delete-title" style={{ fontSize: 20 }}>Excluir registro?</div>
            <div className="delete-desc" style={{ marginBottom: 24, fontSize: 14 }}>
              Tem certeza que deseja apagar o registro do dia <strong>{new Date(deletingEntry.date + "T12:00:00").toLocaleDateString("pt-BR")}</strong>?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-outline" onClick={() => setDeletingEntry(null)}>Cancelar</button>
              <button className="btn-danger" onClick={confirmDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Patient Progress ─────────────────────────────────────────────────────────
function PatientProgress({ session }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const [responses, exercises, diary, goals] = await Promise.all([
        db.query("responses", { filter: { patient_id: session.id }, order: "completed_at.asc" }),
        db.query("exercises"),
        db.query("diary_entries", { filter: { patient_id: session.id }, order: "date.asc" }),
        db.query("goals", { filter: { patient_id: session.id } }),
      ]);

      const exList = Array.isArray(exercises) ? exercises : [];
      const rList = Array.isArray(responses) ? responses : [];
      const dList = Array.isArray(diary) ? diary : [];
      const g = Array.isArray(goals) && goals.length > 0 ? goals[0] : null;

      const scalePts = rList.map((r) => {
        const ex = exList.find((e) => e.id === r.exercise_id);
        const qs = ex ? parseQuestions(ex) : [];
        const ans = parseAnswers(r);
        const scVals = qs.reduce((acc, q, i) => (q.type === "scale" && ans[i] !== "" ? [...acc, Number(ans[i])] : acc), []);
        return scVals.length
          ? { date: new Date(r.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), avg: Math.round((scVals.reduce((a, b) => a + b, 0) / scVals.length) * 10) / 10 }
          : null;
      }).filter(Boolean);

      const moodPts = dList.map((d) => ({
        date: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        val: d.mood,
      }));

      const now = new Date();
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const ds = d.toISOString().split("T")[0];
        if (dList.find((e) => e.date === ds) || rList.find((r) => r.completed_at?.startsWith(ds))) streak++;
        else break;
      }

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const weekDone = rList.filter((r) => new Date(r.completed_at) >= startOfWeek).length;

      setData({ scalePts, moodPts, streak, total: rList.length, diaryCount: dList.length, weekDone, goal: g });
    })();
  }, [session.id]);

  if (!data) return <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Carregando...</div>;

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div className="page-header"><h2>📊 Meu Progresso</h2><p>Acompanhe sua evolução ao longo do tempo</p></div>
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-val">{data.streak}</div><div className="stat-label">Dias seguidos</div></div>
        <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-val">{data.total}</div><div className="stat-label">Exercícios feitos</div></div>
        <div className="stat-card"><div className="stat-icon">📓</div><div className="stat-val">{data.diaryCount}</div><div className="stat-label">Registros no diário</div></div>
      </div>

      {data.goal && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Meta desta semana</h3>
          <WeekGoalBar done={data.weekDone} target={data.goal.weekly_target} />
        </div>
      )}

      {data.scalePts.length >= 2 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Evolução das suas respostas de escala</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Média das escalas (0–10) por exercício</p>
          <MiniLineChart points={data.scalePts.map((p) => p.avg)} labels={data.scalePts.map((p) => p.date)} height={90} />
        </div>
      )}

      {data.moodPts.length >= 2 && (
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 4 }}>Histórico do humor</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Do diário emocional (1=difícil, 5=ótimo)</p>
          <MiniLineChart points={data.moodPts.map((p) => p.val)} labels={data.moodPts.map((p) => p.date)} height={90} color="var(--orange)" />
        </div>
      )}

      {data.scalePts.length < 2 && data.moodPts.length < 2 && (
        <div className="card"><div className="empty-state"><div className="empty-icon">📈</div><p>Complete mais exercícios e registros no diário para ver seu progresso aqui.</p></div></div>
      )}
    </div>
  );
}

// ─── Exercise Page ────────────────────────────────────────────────────────────
function ExercisePage({ exercise, session, onBack }) {
  const questions = exercise.questions;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(""));
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = questions[step];
  const progress = (step / questions.length) * 100;
  const setAns = (val) => setAnswers((a) => { const n = [...a]; n[step] = val; return n; });

  const next = async () => {
    if (step < questions.length - 1) { setStep((s) => s + 1); return; }
    setSaving(true);
    await db.insert("responses", {
      id: "r" + Date.now(),
      patient_id: session.id,
      exercise_id: exercise.id,
      completed_at: new Date().toISOString(),
      answers: JSON.stringify(answers),
    });
    await db.update(
      "assignments",
      { patient_id: session.id, exercise_id: exercise.id },
      { status: "done" }
    );
    if (session.therapist_id) {
      await db.insert("notifications", {
        id: "n" + Date.now(),
        therapist_id: session.therapist_id,
        patient_id: session.id,
        patient_name: session.name,
        exercise_title: exercise.title,
        created_at: new Date().toISOString(),
        read: false,
      });
    }
    setSaving(false);
    setDone(true);
  };

  if (done)
    return (
      <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="question-card" style={{ textAlign: "center", maxWidth: 460 }}>
          <img src={LOGO} alt="Equilibre" style={{ width: 60, height: 60, objectFit: "contain", marginBottom: 14 }} />
          <h2 style={{ fontSize: 24, marginBottom: 10 }}>Exercício concluído!</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24 }}>Suas respostas foram salvas. Sua psicóloga poderá acompanhar seu progresso. Parabéns por cuidar de você!</p>
          <button className="btn btn-sage" style={{ padding: "13px 30px" }} onClick={onBack}>Voltar aos exercícios</button>
        </div>
      </div>
    );

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "38px 22px" }}>
      <div className="exercise-page">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <button className="btn btn-outline btn-sm" onClick={onBack}>← Voltar</button>
          <div style={{ flex: 1, fontFamily: "Playfair Display, serif", fontSize: 15, color: "var(--sage-dark)" }}>{exercise.title}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{step + 1} / {questions.length}</div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="question-card">
          <div className="q-step">Pergunta {step + 1}</div>
          {q.type === "instruction" && <div className="q-instruction">{q.text}</div>}
          {q.type === "reflect" && (
            <>
              <div className="q-reflect">{q.text}</div>
              <textarea className="q-textarea" placeholder="Escreva sua reflexão aqui... (opcional)" value={answers[step]} onChange={(e) => setAns(e.target.value)} />
            </>
          )}
          {q.type === "open" && (
            <>
              <div className="q-text">{q.text}</div>
              <textarea className="q-textarea" placeholder="Escreva sua resposta aqui..." value={answers[step]} onChange={(e) => setAns(e.target.value)} />
            </>
          )}
          {q.type === "scale" && (
            <>
              <div className="q-text">{q.text}</div>
              <div className="scale-row">
                {Array.from({ length: 11 }, (_, i) => (
                  <button key={i} className={`scale-btn ${answers[step] == i ? "selected" : ""}`} onClick={() => setAns(String(i))}>{i}</button>
                ))}
              </div>
            </>
          )}
          <div className="q-nav">
            <button className="btn btn-outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>← Anterior</button>
            <button className="btn btn-sage" onClick={next} disabled={saving}>
              {saving ? "Salvando..." : step === questions.length - 1 ? "Concluir ✓" : "Próximo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}