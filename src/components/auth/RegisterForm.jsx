import { useState } from "react";
import { validateRegisterForm } from "../../utils/validation";
import "./RegisterForm.css";

/* ── Role card data ─────────────────────────────────────────
   Centralizar aqui facilita future i18n ou A/B test.
   iconBg: cor de fundo do ícone no estado inativo
   accent: cor de destaque (borda + glow) quando selecionado
─────────────────────────────────────────────────────────── */
const ROLES = [
  {
    value: "patient",
    icon: "🌱",
    title: "Sou Paciente",
    desc: "Busco apoio emocional e acompanhamento terapêutico",
    tag: "Paciente",
    iconBg: "var(--pt-sage-050, #edf7ee)",
    accent: "var(--pt-sage-500, #6b9e78)",
    accentRgb: "107, 158, 120",
  },
  {
    value: "therapist",
    icon: "🧠",
    title: "Sou Profissional",
    desc: "Quero gerenciar exercícios e acompanhar meus pacientes",
    tag: "Profissional",
    iconBg: "var(--pt-blue-050, #eef6fc)",
    accent: "var(--pt-blue-500, #2e7fab)",
    accentRgb: "46, 127, 171",
  },
];

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

  /* Role selecionado — usado para colorir o card e o botão */
  const activeRole = ROLES.find((r) => r.value === form.role);

  return (
    <>
      {/* ── Role Selection Cards ──────────────────────────────
          Cada card é um <button> semântico (acessível por teclado).
          O estado `form.role` é atualizado diretamente ao clicar,
          alimentando handleSubmit e a lógica de campos condicionais.
      ─────────────────────────────────────────────────────── */}
      <div className="rf-role-grid" role="group" aria-label="Tipo de conta">
        {ROLES.map((role) => {
          const isActive = form.role === role.value;
          return (
            <button
              key={role.value}
              type="button"
              className={`rf-role-card${isActive ? " rf-role-card--active" : ""}`}
              onClick={() => setForm((f) => ({ ...f, role: role.value }))}
              aria-pressed={isActive}
              /* CSS custom properties injetadas inline para que cada
                 card use sua própria cor de acento sem classes extras */
              style={{
                "--rc-accent":     role.accent,
                "--rc-accent-rgb": role.accentRgb,
                "--rc-icon-bg":    role.iconBg,
              }}
            >
              {/* Marca de seleção — aparece apenas quando ativo */}
              <span className="rf-role-card__check" aria-hidden="true">✓</span>

              <span className="rf-role-card__icon-wrap" aria-hidden="true">
                {role.icon}
              </span>

              <span className="rf-role-card__body">
                <span className="rf-role-card__title">{role.title}</span>
                <span className="rf-role-card__desc">{role.desc}</span>
              </span>

              {/* Tag discreta no canto — reforça a identidade sem poluir */}
              <span className="rf-role-card__tag">{role.tag}</span>
            </button>
          );
        })}
      </div>

      {/* ── Campos do formulário ─────────────────────────────── */}
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

      {/* Campo de convite — visível apenas para pacientes */}
      {form.role === "patient" && (
        <div className="rf-field rf-field--invite">
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

      {/* Botão de submit — cor de acento segue o role selecionado */}
      <button
        className="rf-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
        style={{
          "--rc-accent":     activeRole.accent,
          "--rc-accent-rgb": activeRole.accentRgb,
        }}
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