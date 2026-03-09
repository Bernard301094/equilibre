import { useState } from "react";
import { validateRegisterForm } from "../../utils/validation";
import "./RegisterForm.css";

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
    if (validationErr) { setError(validationErr); return; }
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
    <>
      {/* Role tabs */}
      <div className="rf-role-tabs">
        <button
          type="button"
          className={`rf-role-tabs__btn${form.role === "therapist" ? " rf-role-tabs__btn--active" : ""}`}
          onClick={() => setForm((f) => ({ ...f, role: "therapist" }))}
        >
          Sou Psicóloga
        </button>
        <button
          type="button"
          className={`rf-role-tabs__btn${form.role === "patient" ? " rf-role-tabs__btn--active" : ""}`}
          onClick={() => setForm((f) => ({ ...f, role: "patient" }))}
        >
          Sou Paciente
        </button>
      </div>

      <div className="rf-field">
        <label className="rf-field__label" htmlFor="reg-name">Nome completo</label>
        <input
          className="rf-field__input"
          id="reg-name"
          type="text"
          value={form.name}
          onChange={update("name")}
          placeholder="Seu nome"
          autoComplete="name"
        />
      </div>

      <div className="rf-field">
        <label className="rf-field__label" htmlFor="reg-email">E-mail</label>
        <input
          className="rf-field__input"
          id="reg-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div className="rf-field">
        <label className="rf-field__label" htmlFor="reg-password">Senha</label>
        <input
          className="rf-field__input"
          id="reg-password"
          type="password"
          value={form.password}
          onChange={update("password")}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>

      <div className="rf-field">
        <label className="rf-field__label" htmlFor="reg-confirm">Confirmar senha</label>
        <input
          className="rf-field__input"
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
        <div className="rf-field">
          <label className="rf-field__label" htmlFor="reg-invite">
            Código de convite
          </label>
          <input
            className="rf-field__input rf-field__input--code"
            id="reg-invite"
            type="text"
            value={form.inviteCode}
            onChange={(e) =>
              setForm((f) => ({ ...f, inviteCode: e.target.value.toUpperCase() }))
            }
            placeholder="Ex: AB3X9K7"
            maxLength={10}
            autoComplete="off"
          />
          <p className="rf-field__hint">
            Código único enviado pela sua psicóloga.
          </p>
        </div>
      )}

      {error && (
        <p className="rf-error-msg" role="alert">{error}</p>
      )}

      <button
        className="rf-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="rf-switch-row">
        Já tem conta?{" "}
        <button
          type="button"
          className="rf-switch-btn"
          onClick={onSwitchMode}
        >
          Entrar
        </button>
      </p>
    </>
  );
}