import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { useTheme }   from "./hooks/useTheme";
import db   from "./services/db";
import auth from "./services/auth";
import { SEED_EXERCISES, LS_SEEDED_KEY, ROLE } from "./utils/constants";
import Spinner         from "./components/ui/Spinner";
import ConnectionToast from "./components/ui/ConnectionToast";
import LoginPage       from "./components/auth/LoginPage";
import TherapistLayout from "./components/layout/TherapistLayout";
import PatientLayout   from "./components/layout/PatientLayout";

/* ── Seed helper ──────────────────────────────────────────── */
async function seedExercisesIfNeeded() {
  if (localStorage.getItem(LS_SEEDED_KEY)) return;
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
    localStorage.setItem(LS_SEEDED_KEY, "true");
  } catch (e) {
    console.warn("[seed] failed:", e.message);
  }
}

/* ── resolveLogin ─────────────────────────────────────────── */
async function resolveLogin({ email, password, role }) {
  const authData = await auth.signIn(email, password);

  if (!authData?.access_token) {
    throw new Error(
      authData?.error_description || authData?.msg || "Erro na autenticação."
    );
  }

  const token = authData.access_token;
  let userRow = null;

  try {
    const byId = await db.query("users", { filter: { id: authData.user.id } }, token);
    if (Array.isArray(byId) && byId.length > 0) userRow = byId[0];
  } catch (_) {}

  if (!userRow) {
    try {
      const byEmail = await db.query("users", { filter: { email } }, token);
      if (Array.isArray(byEmail) && byEmail.length > 0) userRow = byEmail[0];
    } catch (_) {}
  }

  if (!userRow) {
    if (role === ROLE.PATIENT) {
      throw new Error(
        "Conta não encontrada. Para aceder, solicite um novo convite à sua profissional."
      );
    }
    const meta     = authData.user?.user_metadata || {};
    const metaRole = meta.role || role;
    if (metaRole !== role) throw new Error("Conta não encontrada para este perfil.");
    return {
      id: authData.user.id,
      email: authData.user.email,
      name: meta.name || authData.user.email,
      role: metaRole,
      access_token: token,
      refresh_token: authData.refresh_token,
    };
  }

  if (userRow.role !== role) throw new Error("Conta não encontrada para este perfil.");
  if (userRow.deleted_at) {
    throw new Error(
      "Esta conta foi encerrada. Para voltar a aceder, solicite um novo convite à sua profissional."
    );
  }

  return { ...userRow, access_token: token, refresh_token: authData.refresh_token };
}

/* ── resolveRegister ──────────────────────────────────────── */
async function resolveRegister(form) {
  let therapistId = null;

  if (form.role === ROLE.PATIENT) {
    const code = form.inviteCode.trim().toUpperCase();
    let invites;
    try {
      invites = await db.query("invites", { filter: { code } });
    } catch {
      return "Erro ao verificar o código. Tente novamente.";
    }
    if (!Array.isArray(invites) || invites.length === 0) return "Código de convite inválido.";
    const invite = invites[0];
    if (invite.status !== "pending") return "Este código já foi utilizado ou expirou.";
    therapistId = invite.therapist_id ?? invite.therapistid ?? null;
  }

  let userId, token, isReactivation = false;

  try {
    const authRes = await auth.signUp(form.email, form.password, { name: form.name, role: form.role });
    userId = authRes?.user?.id ?? authRes?.id;
    token  = authRes?.access_token ?? authRes?.session?.access_token ?? null;
    if (!userId) throw new Error("ID não retornado na criação.");
  } catch (signUpErr) {
    const msg = (signUpErr.message || "").toLowerCase();
    const isAlready =
      msg.includes("already registered") ||
      msg.includes("already been registered") ||
      msg.includes("id não retornado");

    if (isAlready) {
      try {
        const authRes = await auth.signIn(form.email, form.password);
        if (!authRes?.access_token) return "Erro ao autenticar conta existente. Verifique a senha.";
        userId = authRes?.user?.id;
        token  = authRes.access_token;
        isReactivation = true;
      } catch {
        return (
          "Este e-mail já tem uma conta anterior. " +
          "Se não lembra da senha, volte para 'Entrar', clique em 'Esqueceu a senha?' e redefina-a antes de usar o convite."
        );
      }
    } else {
      return `Erro ao criar conta: ${signUpErr.message}`;
    }
  }

  if (!userId) return "Erro ao criar conta. ID inválido.";

  try {
    if (isReactivation) {
      try {
        await db.update(
          "users", { id: userId },
          { name: form.name, role: form.role, therapist_id: therapistId, deleted_at: null },
          token
        );
      } catch {
        await db.insert(
          "users",
          { id: userId, name: form.name, email: form.email, role: form.role, therapist_id: therapistId },
          token
        );
      }
    } else {
      await db.insert(
        "users",
        { id: userId, name: form.name, email: form.email, role: form.role, therapist_id: therapistId },
        token
      );
    }

    if (form.role === ROLE.PATIENT) {
      const code = form.inviteCode.trim().toUpperCase();
      await db.update(
        "invites", { code },
        { status: "used", used_by: userId, used_at: new Date().toISOString() },
        token
      );
    }
    return null;
  } catch (e) {
    return `Erro ao finalizar criação de conta: ${e.message}`;
  }
}

/* ════════════════════════════════════════════════════════════
   ROUTE MAPS
   ════════════════════════════════════════════════════════════ */
export const THERAPIST_ROUTES = {
  dashboard:     "/terapeuta/inicio",
  patients:      "/terapeuta/pacientes",
  exercises:     "/terapeuta/exercicios",
  create:        "/terapeuta/criar",
  progress:      "/terapeuta/progresso",
  responses:     "/terapeuta/respostas",
  notifications: "/terapeuta/notificacoes",
};

export const PATIENT_ROUTES = {
  home:      "/paciente/inicio",
  exercises: "/paciente/exercicios",
  diary:     "/paciente/diario",
  routine:   "/paciente/rotina",
  progress:  "/paciente/progresso",
  history:   "/paciente/historico",
};

export const PATH_TO_THERAPIST_VIEW = Object.fromEntries(
  Object.entries(THERAPIST_ROUTES).map(([id, path]) => [path, id])
);
export const PATH_TO_PATIENT_VIEW = Object.fromEntries(
  Object.entries(PATIENT_ROUTES).map(([id, path]) => [path, id])
);

/* ── Guard de rota ───────────────────────────────────────── */
function RequireAuth({ session, role, redirectTo, children }) {
  if (!session)             return <Navigate to="/entrar"   replace />;
  if (session.role !== role) return <Navigate to={redirectTo} replace />;
  return children;
}

/* ── LoginWrapper ────────────────────────────────────────── */
function LoginWrapper({ onLogin, onRegister }) {
  const navigate = useNavigate();

  const handleLogin = async (form) => {
    const err = await onLogin(form);
    if (!err) {
      // sessão setada — RequireAuth cuida do redirect
    }
    return err;
  };

  return <LoginPage onLogin={handleLogin} onRegister={onRegister} />;
}

/* ── AppRoutes ───────────────────────────────────────────── */
function AppRoutes({ session, setSession, updateSession, logout, theme, toggleTheme }) {

  const defaultRedirect = !session
    ? "/entrar"
    : session.role === ROLE.THERAPIST
    ? THERAPIST_ROUTES.dashboard
    : PATIENT_ROUTES.home;

  const sharedTherapist = { session, setSession, updateSession, logout, theme, toggleTheme };
  const sharedPatient   = { session, setSession, updateSession, logout, theme, toggleTheme };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultRedirect} replace />} />

      <Route
        path="/entrar"
        element={
          session
            ? <Navigate to={defaultRedirect} replace />
            : <LoginWrapper
                onLogin={async (form) => {
                  try {
                    const resolved = await resolveLogin(form);
                    setSession(resolved);
                    return null;
                  } catch (e) { return e.message; }
                }}
                onRegister={resolveRegister}
              />
        }
      />

      {/* ── Terapeuta ── */}
      <Route
        path="/terapeuta"
        element={
          <RequireAuth session={session} role={ROLE.THERAPIST} redirectTo="/entrar">
            <TherapistLayout {...sharedTherapist} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={THERAPIST_ROUTES.dashboard} replace />} />
        <Route path="inicio"       element={<TherapistDashboard session={session} />} />
        <Route path="pacientes"    element={<PatientsView       session={session} />} />
        <Route path="exercicios"   element={<ExercisesView      session={session} />} />
        <Route path="criar"        element={<CreateExerciseView session={session} />} />
        <Route path="progresso"    element={<TherapistProgress  session={session} />} />
        <Route path="respostas"    element={<ResponsesView      session={session} />} />
        <Route path="notificacoes" element={<NotificationsView  session={session} />} />
        <Route path="*" element={<Navigate to={THERAPIST_ROUTES.dashboard} replace />} />
      </Route>

      {/* ── Paciente ── */}
      <Route
        path="/paciente"
        element={
          <RequireAuth session={session} role={ROLE.PATIENT} redirectTo="/entrar">
            <PatientLayout {...sharedPatient} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={PATIENT_ROUTES.home} replace />} />
        <Route path="inicio"     element={<PatientHome      session={session} setSession={setSession} />} />
        <Route path="exercicios" element={<PatientExercises session={session} />} />
        <Route path="diario"     element={<PatientDiary     session={session} />} />
        <Route path="rotina"     element={<PatientRoutine   session={session} />} />
        <Route path="progresso"  element={<PatientProgress  session={session} />} />
        <Route path="historico"  element={<PatientHistory   session={session} />} />
        <Route path="*" element={<Navigate to={PATIENT_ROUTES.home} replace />} />
      </Route>

      <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
    </Routes>
  );
}

/* ── Imports das views ───────────────────────────────────── */
import TherapistDashboard  from "./features/therapist/Dashboard";
import PatientsView        from "./features/therapist/PatientsView";
import ExercisesView       from "./features/therapist/ExercisesView";
import CreateExerciseView  from "./features/therapist/CreateExerciseView";
import ResponsesView       from "./features/therapist/ResponsesView";
import TherapistProgress   from "./features/therapist/TherapistProgress";
import NotificationsView   from "./features/therapist/NotificationsView";
import PatientHome         from "./features/patient/Home";
import PatientExercises    from "./features/patient/PatientExercises";
import PatientDiary        from "./features/patient/DiaryView";
import PatientRoutine      from "./features/patient/RoutineView";
import PatientProgress     from "./features/patient/PatientProgress";
import PatientHistory      from "./features/patient/PatientHistory";

/* ── App root ─────────────────────────────────────────────── */
export default function App() {
  const { session, setSession, updateSession, logout, sessionReady } = useSession();
  const { theme, toggleTheme } = useTheme(session?.id ?? null);

  const [appReady, setAppReady] = useState(false);
  const [dbError,  setDbError]  = useState(false);

  useEffect(() => {
    seedExercisesIfNeeded()
      .catch(() => setDbError(true))
      .finally(() => setAppReady(true));
  }, []);

  if (!sessionReady || !appReady) {
    return <Spinner message="Conectando ao Equilibre..." />;
  }

  if (dbError) {
    return <Spinner message="Erro ao conectar ao banco de dados. Verifique as configurações." />;
  }

  return (
    <BrowserRouter>
      {/* ── Toast de conexão — visível em todas as telas ── */}
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