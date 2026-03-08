import { useState } from "react";
import { validateLoginForm } from "../../utils/validation";

/**
 * Props:
 *   onLogin        — async ({ email, password, role }) => errorString | null
 *   onForgot       — callback to switch to the forgot-password view
 *   successMessage — optional banner text (e.g. "Conta criada com sucesso!")
 */
export default function LoginForm({ onLogin, onForgot, successMessage }) {
  const [tab,     setTab]     = useState("therapist");
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    const validationErr = validateLoginForm(form);
    if (validationErr) { setError(validationErr); return; }
    setLoading(true);
    const serverErr = await onLogin({ ...form, role: tab });
    setLoading(false);
    if (serverErr) setError(serverErr);
  };

  return (
    <>
      {/* Role tabs */}
      <div className="tab-switch lf-tabs">
        <button
          type="button"
          className={tab === "therapist" ? "active" : ""}
          onClick={() => { setTab("therapist"); setError(""); }}
        >
          Psicóloga
        </button>
        <button
          type="button"
          className={tab === "patient" ? "active" : ""}
          onClick={() => { setTab("patient"); setError(""); }}
        >
          Paciente
        </button>
      </div>

      {successMessage && (
        <div className="success-banner" role="status">
          ✅ {successMessage}
        </div>
      )}

      <div className="field">
        <label htmlFor="login-email">E-mail</label>
        <input
          id="login-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="login-password">Senha</label>
        <input
          id="login-password"
          type="password"
          value={form.password}
          onChange={update("password")}
          placeholder="••••••"
          autoComplete="current-password"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {error && (
        <p className="error-msg" role="alert">
          {error}
        </p>
      )}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="lf-forgot-row">
        <button
          type="button"
          className="lf-forgot-btn"
          onClick={() => onForgot?.(form.email)}
        >
          Esqueceu a senha?
        </button>
      </p>
    </>
  );
}