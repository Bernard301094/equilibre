import { useEffect, useState } from "react";
import "./App.css";

import { useSession } from "./hooks/useSession";
import { useTheme } from "./hooks/useTheme";
import db from "./services/db";
import auth from "./services/auth";
import { SEED_EXERCISES, LS_SEEDED_KEY, ROLE } from "./utils/constants";

import Spinner from "./components/ui/Spinner";
import LoginPage from "./components/auth/LoginPage";
import TherapistLayout from "./components/layout/TherapistLayout";
import PatientLayout from "./components/layout/PatientLayout";

// ─── Seed helper ──────────────────────────────────────────────────────────────
async function seedExercisesIfNeeded() {
  const already = localStorage.getItem(LS_SEEDED_KEY);
  if (already) return;
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

// ─── handleLogin ─────────────────────────────────────────────────────────────
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
    const byId = await db.query(
      "users",
      { filter: { id: authData.user.id } },
      token
    );
    if (Array.isArray(byId) && byId.length > 0) {
      userRow = byId[0];
    }
  } catch (_) {}

  if (!userRow) {
    try {
      const byEmail = await db.query("users", { filter: { email } }, token);
      if (Array.isArray(byEmail) && byEmail.length > 0) {
        userRow = byEmail[0];
      }
    } catch (_) {}
  }

  if (!userRow) {
    if (role === ROLE.PATIENT) {
      throw new Error(
        "Conta não encontrada. Para aceder, solicite um novo convite à sua profissional."
      );
    }
    const meta = authData.user?.user_metadata || {};
    const metaRole = meta.role || role;
    if (metaRole !== role) {
      throw new Error("Conta não encontrada para este perfil.");
    }
    return {
      id: authData.user.id,
      email: authData.user.email,
      name: meta.name || authData.user.email,
      role: metaRole,
      access_token: token,
      refresh_token: authData.refresh_token,
    };
  }

  if (userRow.role !== role) {
    throw new Error("Conta não encontrada para este perfil.");
  }

  if (userRow.deleted_at) {
    throw new Error(
      "Esta conta foi encerrada. Para voltar a aceder, solicite um novo convite à sua profissional."
    );
  }

  return {
    ...userRow,
    access_token: token,
    refresh_token: authData.refresh_token,
  };
}

// ─── handleRegister ───────────────────────────────────────────────────────────
async function resolveRegister(form) {
  let therapistId = null;

  if (form.role === ROLE.PATIENT) {
    const code = form.inviteCode.trim().toUpperCase();
    let invites;
    try {
      invites = await db.query("invites", { filter: { code } });
    } catch (e) {
      return "Erro ao verificar o código. Tente novamente.";
    }
    if (!Array.isArray(invites) || invites.length === 0) {
      return "Código de convite inválido.";
    }
    const invite = invites[0];
    if (invite.status !== "pending") {
      return "Este código já foi utilizado ou expirou.";
    }
    therapistId = invite.therapist_id ?? invite.therapistid ?? null;
  }

  let userId;
  let token;
  let isReactivation = false;

  try {
    const authRes = await auth.signUp(form.email, form.password, {
      name: form.name,
      role: form.role,
    });
    userId = authRes?.user?.id ?? authRes?.id;
    token = authRes?.access_token ?? authRes?.session?.access_token ?? null;
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
        if (!authRes?.access_token) {
          return "Erro ao autenticar conta existente. Verifique a senha.";
        }
        userId = authRes?.user?.id;
        token = authRes.access_token;
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
          "users",
          { id: userId },
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
        "invites",
        { code },
        { status: "used", used_by: userId, used_at: new Date().toISOString() },
        token
      );
    }

    return null;
  } catch (e) {
    return `Erro ao finalizar criação de conta: ${e.message}`;
  }
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { session, setSession, updateSession, logout, sessionReady } = useSession();
  const { theme, toggleTheme } = useTheme(session?.id ?? null);

  const [appReady, setAppReady] = useState(false);
  const [dbError, setDbError] = useState(false);

  const defaultView = session?.role === ROLE.PATIENT ? "home" : "dashboard";
  const [view, setView] = useState(defaultView);

  useEffect(() => {
    if (session) {
      setView(session.role === ROLE.PATIENT ? "home" : "dashboard");
    }
  }, [session?.id]);

  useEffect(() => {
    seedExercisesIfNeeded()
      .catch(() => setDbError(true))
      .finally(() => setAppReady(true));
  }, []);

  const handleLogin = async ({ email, password, role }) => {
    try {
      const resolved = await resolveLogin({ email, password, role });
      setSession(resolved);
      return null;
    } catch (e) {
      return e.message;
    }
  };

  const handleRegister = async (form) => {
    return resolveRegister(form);
  };

  // Render condicional basado en el estado
  const renderContent = () => {
    if (!sessionReady || !appReady) {
      return <Spinner message="Conectando ao Equilibre..." />;
    }

    if (dbError) {
      return <Spinner message="Erro ao conectar ao banco de dados. Verifique as configurações." />;
    }

    if (!session) {
      return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
    }

    if (session.role === ROLE.THERAPIST) {
      return (
        <TherapistLayout
          session={session}
          setSession={setSession}
          updateSession={updateSession}
          logout={logout}
          view={view}
          setView={setView}
          toggleTheme={toggleTheme}
          theme={theme}
        />
      );
    }

    return (
      <PatientLayout
        session={session}
        setSession={setSession}
        updateSession={updateSession}
        logout={logout}
        view={view}
        setView={setView}
        toggleTheme={toggleTheme}
        theme={theme}
      />
    );
  };

  return (
    <div className="app-root">
      {renderContent()}
    </div>
  );
}