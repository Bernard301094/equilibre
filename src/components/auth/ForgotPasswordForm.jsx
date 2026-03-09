import { useState } from "react";
import auth from "../../services/auth";
import { validateResetEmail } from "../../utils/validation";
import "./ForgotPasswordForm.css";

export default function ForgotPasswordForm({ initialEmail = "", onBack }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async () => {
    const err = validateResetEmail(email);
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await auth.resetPassword(email.trim());
      setMessage({
        type: "success",
        text: "✅ E-mail enviado! Verifique a sua caixa de entrada (e a pasta de spam).",
      });
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Erro ao enviar e-mail." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fpf-header">
        <span className="fpf-header__icon" aria-hidden="true">🔑</span>
        <h2 className="fpf-header__title">Recuperar senha</h2>
        <p className="fpf-header__description">
          Informe o seu e-mail e enviaremos um link para redefinir a sua senha.
        </p>
      </div>

      <div className="fpf-field">
        <label className="fpf-field__label" htmlFor="reset-email">
          E-mail
        </label>
        <input
          className="fpf-field__input"
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      </div>

      {message.text && (
        <p
          className={`fpf-message fpf-message--${message.type}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      <button
        className="fpf-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "A enviar..." : "Enviar link de recuperação"}
      </button>

      <p className="fpf-back-row">
        <button
          type="button"
          className="fpf-back-btn"
          onClick={onBack}
        >
          ← Voltar ao login
        </button>
      </p>
    </>
  );
}