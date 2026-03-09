import { useState } from "react";
import auth from "../../services/auth";
import { validateResetEmail } from "../../utils/validation";
import "./ForgotPasswordForm.css";

/**
 * Props:
 * initialEmail  — pre-fills the email field
 * onBack        — callback to return to the login view
 */
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
    <div className="forgot-form-wrapper">
      <div className="forgot-header">
        <div className="forgot-icon" aria-hidden="true">
          🔑
        </div>
        <h2 className="forgot-title">Recuperar senha</h2>
        <p className="forgot-desc">
          Informe o seu e-mail e enviaremos um link para redefinir a sua senha.
        </p>
      </div>

      <div className="forgot-field">
        <label className="forgot-label" htmlFor="reset-email">E-mail</label>
        <input
          className="forgot-input"
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
          className={`forgot-msg ${message.type === "success" ? "forgot-msg-success" : "forgot-msg-error"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}

      <button
        className="forgot-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "A enviar..." : "Enviar link de recuperação"}
      </button>

      <div className="forgot-footer">
        <button
          className="forgot-back-btn"
          type="button"
          onClick={onBack}
        >
          ← Voltar ao login
        </button>
      </div>
    </div>
  );
}