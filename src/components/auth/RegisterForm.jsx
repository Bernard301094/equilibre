import { useState } from "react";
import { validateRegisterForm } from "../../utils/validation";
import "./RegisterForm.css";

/**
 * Props:
 * onRegister   — async (formData) => errorString | null
 * onSuccess    — called after successful registration; receives the role
 * onSwitchMode — callback to go back to login
 */
export default function RegisterForm({ onRegister, onSuccess, onSwitchMode }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    inviteCode: "",
    role: "therapist",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    const validationErr = validateRegisterForm(form);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);
    const serverErr = await onRegister(form);
    setLoading(false);

    if (serverErr) {
      setError(serverErr);
    } else {
      onSuccess?.(form.role);
    }
  };

  return (
    <div className="register-form-wrapper">
      {/* Role tabs */}
      <div className="register-tab-switch">
        <button
          type="button"
          className={form.role === "therapist" ? "active" : ""}
          onClick={() => setForm((f) => ({ ...f, role: "therapist" }))}
        >
          Sou Psicóloga
        </button>
        <button
          type="button"
          className={form.role === "patient" ? "active" : ""}
          onClick={() => setForm((f) => ({ ...f, role: "patient" }))}
        >
          Sou Paciente
        </button>
      </div>

      <div className="register-field">
        <label className="register-label" htmlFor="reg-name">Nome completo</label>
        <input
          className="register-input"
          id="reg-name"
          type="text"
          value={form.name}
          onChange={update("name")}
          placeholder="Seu nome"
          autoComplete="name"
        />
      </div>

      <div className="register-field">
        <label className="register-label" htmlFor="reg-email">E-mail</label>
        <input
          className="register-input"
          id="reg-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div className="register-field">
        <label className="register-label" htmlFor="reg-password">Senha</label>
        <input
          className="register-input"
          id="reg-password"
          type="password"
          value={form.password}
          onChange={update("password")}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>

      <div className="register-field">
        <label className="register-label" htmlFor="reg-confirm">Confirmar senha</label>
        <input
          className="register-input"
          id="reg-confirm"
          type="password"
          value={form.confirm}
          onChange={update("confirm")}
          placeholder="Repita a senha"
          autoComplete="new-password"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {form.role === "patient" && (
        <div className="register-field">
          <label className="register-label" htmlFor="reg-invite">Código de convite</label>
          <input
            className="register-input register-input-code"
            id="reg-invite"
            type="text"
            value={form.inviteCode}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                inviteCode: e.target.value.toUpperCase(),
              }))
            }
            placeholder="Ex: AB3X9K7"
            maxLength={10}
            autoComplete="off"
          />
          <div className="register-hint">
            Código único enviado pela sua psicóloga.
          </div>
        </div>
      )}

      {error && (
        <p className="register-error-msg" role="alert">
          {error}
        </p>
      )}

      <button
        className="register-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <div className="register-footer">
        <p>Já tem conta?</p>
        <button
          className="register-link-btn"
          type="button"
          onClick={onSwitchMode}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}