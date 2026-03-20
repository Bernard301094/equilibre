// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { useTheme }   from "./hooks/useTheme";
import db   from "./services/db";
import auth from "./services/auth";
import { SEED_EXERCISES, LS_SEEDED_KEY, ROLE } from "./utils/constants";
import Spinner         from "./components/ui/Spinner";
import ConnectionToast from "./components/ui/ConnectionToast";
import ImpersonateBanner from "./components/ui/ImpersonateBanner";
import LoginPage       from "./components/auth/LoginPage";
import TherapistLayout from "./components/layout/TherapistLayout";
import PatientLayout   from "./components/layout/PatientLayout";

import TherapistDashboard        from "./features/therapist/Dashboard";
import PatientsView              from "./features/therapist/PatientsView";
import ExercisesView             from "./features/therapist/ExercisesView";
import CreateExerciseView        from "./features/therapist/CreateExerciseView";
import ResponsesView             from "./features/therapist/ResponsesView";
import NotificationsView         from "./features/therapist/NotificationsView";
import CalendarView              from "./features/therapist/CalendarView";
import PatientHome               from "./features/patient/Home";
import PatientExercises          from "./features/patient/PatientExercises";
import PatientDiary              from "./features/patient/DiaryView";
import PatientRoutine            from "./features/patient/RoutineView";
import PatientHistory            from "./features/patient/PatientHistory"; // inclui tab Progresso
import PatientNotificationsView  from "./features/patient/PatientNotificationsView";
import SessionsView              from "./features/patient/SessionsView";
import MessagesView              from "./components/shared/MessagesView";
import AdminDashboard            from "./features/admin/AdminDashboard";

// ─── Seed (lazy, apenas uma vez por versão) ───────────────────────────────────
const SEED_VERSION     = "2";
const SEED_VERSION_KEY = "eq_seed_version";

let seedPromise = null;
function seedExercisesIfNeeded() {
  if (seedPromise) return seedPromise;
  if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) {
    seedPromise = Promise.resolve();
    return seedPromise;
  }

  const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_KEY;

  if (!SUPA_URL || !SUPA_KEY) { seedPromise = Promise.resolve(); return seedPromise; }

  seedPromise = (async () => {
    try {
      const getRes = await fetch(`${SUPA_URL}/rest/v1/exercises?select=id`, {
        headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
      });
      if (!getRes.ok) throw new Error("Leitura bloqueada por RLS.");
      const existing    = await getRes.json();
      const existingIds = new Set(Array.isArray(existing) ? existing.map((e) => e.id) : []);

      for (const ex of SEED_EXERCISES) {
        const payload  = { ...ex, questions: JSON.stringify(ex.questions) };
        const isUpdate = existingIds.has(ex.id);
        await fetch(
          isUpdate
            ? `${SUPA_URL}/rest/v1/exercises?id=eq.${ex.id}`
            : `${SUPA_URL}/rest/v1/exercises`,
          {
            method: isUpdate ? "PATCH" : "POST",
            headers: {
              apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
              "Content-Type": "application/json", Prefer: "return=minimal",
            },
            body: JSON.stringify(payload),
          }
        );
      }
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      localStorage.setItem(LS_SEEDED_KEY, "true");
    } catch (e) {
      console.warn("[seed] Ignorado silenciosamente.", e.message);
    }
  })();

  return seedPromise;
}

// ─── Login / Register ─────────────────────────────────────────────────────────
async function resolveLogin({ email, password, role }) {
  const authData = await auth.signIn(email, password);

  if (!authData?.access_token) {
    throw new Error(authData?.error_description || authData?.msg || "Erro na autenticação.");
  }

  const token  = authData.access_token;
  const userId = authData.user?.id;

  // ── Admin: verificado pela tabela users (role = 'admin') ──
  let userRow = null;
  try {
    const byId = await db.query("users", { filter: { id: userId } }, token);
    if (Array.isArray(byId) && byId.length > 0) userRow = byId[0];
  } catch (e) { console.warn("[resolveLogin] query por id falhou:", e.message); }

  if (!userRow) {
    try {
      const byEmail = await db.query("users", { filter: { email } }, token);
      if (Array.isArray(byEmail) && byEmail.length > 0) userRow = byEmail[0];
    } catch (e) { console.warn("[resolveLogin] query por email falhou:", e.message); }
  }

  // Permite acesso admin se role na tabela for 'admin'
  if (userRow?.role === "admin") {
    return { ...userRow, access_token: token, refresh_token: authData.refresh_token };
  }

  if (!userRow) {
    if (role === ROLE.PATIENT) throw new Error("Perfil não encontrado no banco.");
    const meta     = authData.user?.user_metadata || {};
    const metaRole = meta.role || role;
    if (metaRole !== role) throw new Error("Conta não encontrada para este perfil.");
    return {
      id: authData.user.id, email: authData.user.email, name: meta.name || authData.user.email,
      role: metaRole, therapist_id: null, access_token: token, refresh_token: authData.refresh_token,
    };
  }

  if (userRow.role !== role) {
    throw new Error(`Você selecionou "${role === ROLE.PATIENT ? "Paciente" : "Psicóloga"}" mas esta conta é do outro perfil.`);
  }

  if (userRow.status === "pending") {
    throw new Error("Sua conta está em análise. Estamos verificando o seu CRP e liberaremos o acesso em breve.");
  }

  if (userRow.deleted_at) {
    throw new Error("Esta conta foi encerrada. Para voltar a aceder, solicite um novo convite.");
  }

  return { ...userRow, access_token: token, refresh_token: authData.refresh_token };
}

async function resolveRegister(form) {
  let therapistId = null;

  if (form.role === ROLE.PATIENT) {
    const code = form.inviteCode.trim().toUpperCase();
    let invites;
    try { invites = await db.query("invites", { filter: { code } }); } catch { return "Erro ao verificar o código. Tente novamente."; }
    if (!Array.isArray(invites) || invites.length === 0) return "Código de convite inválido.";
    if (invites[0].status !== "pending") return "Este código já foi utilizado ou expirou.";
    therapistId = invites[0].therapist_id ?? invites[0].therapistid ?? null;
  }

  let userId, token, isReactivation = false;

  try {
    const authRes = await auth.signUp(form.email, form.password, { name: form.name, role: form.role });
    userId = authRes?.user?.id ?? authRes?.id;
    token  = authRes?.access_token ?? authRes?.session?.access_token ?? null;

    if (userId && !token) {
      try {
        const loginRes = await auth.signIn(form.email, form.password);
        token = loginRes?.access_token || null;
      } catch (loginErr) {
        return "Erro: Token bloqueado. Desative o 'Confirm email' no Supabase.";
      }
    }

    if (!userId) throw new Error("ID não retornado na criação.");
  } catch (signUpErr) {
    const msg = (signUpErr.message || "").toLowerCase();
    const isAlready = msg.includes("already registered") || msg.includes("already been registered") || msg.includes("id não retornado");

    if (isAlready) {
      try {
        const authRes = await auth.signIn(form.email, form.password);
        if (!authRes?.access_token) return "Erro ao autenticar conta existente. Verifique a senha.";
        userId = authRes?.user?.id; token = authRes.access_token; isReactivation = true;
      } catch { return "Este e-mail já tem uma conta anterior."; }
    } else { return `Erro ao criar conta: ${signUpErr.message}`; }
  }

  if (!userId || !token) return "Erro ao criar conta. Credenciais inválidas ou token ausente.";

  try {
    if (isReactivation) {
      try {
        await db.update("users", { id: userId }, { name: form.name, role: form.role, therapist_id: therapistId, deleted_at: null }, token);
      } catch {
        await db.insert("users", { id: userId, name: form.name, email: form.email, role: form.role, therapist_id: therapistId }, token);
      }
    } else {
      await db.insert(
        "users",
        {
          id: userId, name: form.name, email: form.email, role: form.role,
          therapist_id: therapistId,
          crp: form.role === ROLE.THERAPIST ? form.crp : null,
          status: form.role === ROLE.THERAPIST ? "pending" : "active",
        },
        token
      );
    }
    if (form.role === ROLE.PATIENT) {
      await db.update("invites", { code: form.inviteCode.trim().toUpperCase() }, { status: "used", used_by: userId, used_at: new Date().toISOString() }, token);
    }
    return null;
  } catch (e) { return `Erro ao finalizar criação de conta: ${e.message}`; }
}

// ─── Rotas ────────────────────────────────────────────────────────────────────
export const THERAPIST_ROUTES = {
  dashboard:     "/terapeuta/inicio",
  patients:      "/terapeuta/pacientes",
  exercises:     "/terapeuta/exercicios",
  create:        "/terapeuta/criar",
  responses:     "/terapeuta/respostas",
  notifications: "/terapeuta/notificacoes",
  orientacoes:   "/terapeuta/orientacoes",
  agenda:        "/terapeuta/agenda",
};

// /terapeuta/progresso redirige a respostas (mantém links antigos funcionando)
export const PATIENT_ROUTES = {
  home:          "/paciente/inicio",
  exercises:     "/paciente/exercicios",
  diary:         "/paciente/diario",
  routine:       "/paciente/rotina",
  history:       "/paciente/historico",   // inclui tab Progresso
  orientacoes:   "/paciente/orientacoes",
  notifications: "/paciente/notificacoes",
  sessions:      "/paciente/sessoes",
};

export const PATH_TO_THERAPIST_VIEW = Object.fromEntries(
  Object.entries(THERAPIST_ROUTES).map(([id, path]) => [path, id])
);

export const PATH_TO_PATIENT_VIEW = Object.fromEntries(
  Object.entries(PATIENT_ROUTES).map(([id, path]) => [path, id])
);

function RequireAuth({ session, role, redirectTo, children }) {
  if (!session) return <Navigate to="/entrar" replace />;
  if (role !== "any" && session.role !== role) return <Navigate to={redirectTo} replace />;
  return children;
}

function LoginWrapper({ onLogin, onRegister }) {
  return <LoginPage onLogin={onLogin} onRegister={onRegister} />;
}

function AppRoutes({ session, setSession, updateSession, logout, theme, toggleTheme }) {
  const defaultRedirect = !session
    ? "/entrar"
    : session.role === "admin"
      ? "/admin"
      : session.role === ROLE.THERAPIST
        ? THERAPIST_ROUTES.dashboard
        : PATIENT_ROUTES.home;

  const shared = { session, setSession, updateSession, logout, theme, toggleTheme };

  return (
    <>
      <ImpersonateBanner setSession={setSession} />

      <Routes>
        <Route path="/" element={<Navigate to={defaultRedirect} replace />} />

        <Route
          path="/entrar"
          element={
            session ? <Navigate to={defaultRedirect} replace /> :
            <LoginWrapper
              onLogin={async (form) => {
                try { const resolved = await resolveLogin(form); setSession(resolved); return null; }
                catch (e) { return e.message; }
              }}
              onRegister={resolveRegister}
            />
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth session={session} role="admin" redirectTo="/entrar">
              <AdminDashboard session={session} logout={logout} setSession={setSession} />
            </RequireAuth>
          }
        />

        <Route
          path="/terapeuta"
          element={
            <RequireAuth session={session} role={ROLE.THERAPIST} redirectTo="/entrar">
              <TherapistLayout {...shared} />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to={THERAPIST_ROUTES.dashboard} replace />} />
          <Route path="inicio"       element={<TherapistDashboard session={session} />} />
          <Route path="pacientes"    element={<PatientsView session={session} />} />
          <Route path="exercicios"   element={<ExercisesView session={session} />} />
          <Route path="criar"        element={<CreateExerciseView session={session} />} />
          {/* progresso absorvido como tab em respostas — redirige para não quebrar links antigos */}
          <Route path="progresso"    element={<Navigate to={THERAPIST_ROUTES.responses} replace />} />
          <Route path="respostas"    element={<ResponsesView session={session} />} />
          <Route path="notificacoes" element={<NotificationsView session={session} />} />
          <Route path="orientacoes"  element={<MessagesView session={session} />} />
          <Route path="agenda"       element={<CalendarView session={session} />} />
          <Route path="*"            element={<Navigate to={THERAPIST_ROUTES.dashboard} replace />} />
        </Route>

        <Route
          path="/paciente"
          element={
            <RequireAuth session={session} role={ROLE.PATIENT} redirectTo="/entrar">
              <PatientLayout {...shared} />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to={PATIENT_ROUTES.home} replace />} />
          <Route path="inicio"       element={<PatientHome session={session} setSession={setSession} />} />
          <Route path="exercicios"   element={<PatientExercises session={session} />} />
          <Route path="diario"       element={<PatientDiary session={session} />} />
          <Route path="rotina"       element={<PatientRoutine session={session} />} />
          {/* progresso absorvido como tab em historico */}
          <Route path="progresso"    element={<Navigate to={PATIENT_ROUTES.history} replace />} />
          <Route path="historico"    element={<PatientHistory session={session} />} />
          <Route path="orientacoes"  element={<MessagesView session={session} />} />
          <Route path="notificacoes" element={<PatientNotificationsView />} />
          <Route path="sessoes"      element={<SessionsView session={session} />} />
          <Route path="*"            element={<Navigate to={PATIENT_ROUTES.home} replace />} />
        </Route>

        <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  const { session, setSession, updateSession, logout, sessionReady } = useSession();
  const { theme, toggleTheme } = useTheme(session?.id ?? null);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Seed corre em background — nunca bloqueia a UI
    seedExercisesIfNeeded().finally(() => setAppReady(true));
  }, []);

  if (!sessionReady || !appReady) return <Spinner message="Conectando ao Equilibre..." />;

  return (
    <BrowserRouter>
      <ConnectionToast />
      <AppRoutes
        session={session}
        setSession={setSession}
        updateSession={updateSession}
        logout={logout}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    </BrowserRouter>
  );
}