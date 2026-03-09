import { useState } from "react";
import { validateLoginForm } from "../../utils/validation";
import "./LoginForm.css";

/**
 * Props:
 * onLogin        — async ({ email, password, role }) => errorString | null
 * onForgot       — callback to switch to the forgot-password view
 * successMessage — optional banner text (e.g. "Conta criada com sucesso!")
 */
export default function LoginForm({ onLogin, onForgot, successMessage }) {
  const [tab, setTab] = useState("therapist");
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    const validationErr = validateLoginForm(form);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);
    const serverErr = await onLogin({ ...form, role: tab });
    setLoading(false);

    if (serverErr) setError(serverErr);
  };

  return (
    <div className="login-form-wrapper">
      {/* Role tabs */}
      <div className="form-tab-switch">
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
        <div className="form-success-banner" role="status">
          ✅ {successMessage}
        </div>
      )}

      <div className="form-field">
        <label className="form-label" htmlFor="login-email">E-mail</label>
        <input
          className="form-input"
          id="login-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="login-password">Senha</label>
        <input
          className="form-input"
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
        <p className="form-error-msg" role="alert">
          {error}
        </p>
      )}

      <button
        className="form-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <div className="form-forgot-container">
        <button
          className="form-forgot-btn"
          type="button"
          onClick={() => onForgot?.(form.email)}
        >
          Esqueceu a senha?
        </button>
      </div>
    </div>
  );
}