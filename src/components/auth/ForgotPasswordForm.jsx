import { useState } from "react";
import auth from "../../services/auth";
import { validateResetEmail } from "../../utils/validation";

/**
 * Props:
 *   initialEmail  — pre-fills the email field
 *   onBack        — callback to return to the login view
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
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">
          🔑
        </div>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Recuperar senha</h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        >
          Informe o seu e-mail e enviaremos um link para redefinir a sua senha.
        </p>
      </div>

      <div className="field">
        <label htmlFor="reset-email">E-mail</label>
        <input
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
          style={{
            fontSize: 13,
            color: message.type === "success" ? "var(--sage-dark)" : "#c0444a",
            marginBottom: 12,
            textAlign: "center",
          }}
          role="alert"
        >
          {message.text}
        </p>
      )}

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "A enviar..." : "Enviar link de recuperação"}
      </button>

      <p
        style={{
          textAlign: "center",
          marginTop: 12,
          fontSize: 13,
          color: "var(--text-muted)",
        }}
      >
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
          onClick={onBack}
        >
          ← Voltar ao login
        </button>
      </p>
    </>
  );
}