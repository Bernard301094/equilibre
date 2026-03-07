import { useState } from "react";
import { validateRegisterForm } from "../../utils/validation";

/**
 * Props:
 *   onRegister   — async (formData) => errorString | null
 *   onSuccess    — called after successful registration; receives the role
 *   onSwitchMode — callback to go back to login
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
    <>
      {/* Role tabs */}
      <div className="tab-switch" style={{ marginBottom: 18 }}>
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

      <div className="field">
        <label htmlFor="reg-name">Nome completo</label>
        <input
          id="reg-name"
          type="text"
          value={form.name}
          onChange={update("name")}
          placeholder="Seu nome"
          autoComplete="name"
        />
      </div>

      <div className="field">
        <label htmlFor="reg-email">E-mail</label>
        <input
          id="reg-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="seu@email.com"
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="reg-password">Senha</label>
        <input
          id="reg-password"
          type="password"
          value={form.password}
          onChange={update("password")}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>

      <div className="field">
        <label htmlFor="reg-confirm">Confirmar senha</label>
        <input
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
        <div className="field">
          <label htmlFor="reg-invite">Código de convite</label>
          <input
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
            style={{
              fontFamily: "monospace",
              fontSize: 18,
              letterSpacing: "0.12em",
            }}
            maxLength={10}
            autoComplete="off"
          />
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            Código único enviado pela sua psicóloga.
          </div>
        </div>
      )}

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
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <p
        style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
        Já tem conta?{" "}
        <button
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "var(--sage-dark)",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 13,
            padding: 0,
          }}
          onClick={onSwitchMode}
        >
          Entrar
        </button>
      </p>
    </>
  );
}