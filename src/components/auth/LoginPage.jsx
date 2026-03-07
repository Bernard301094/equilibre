import { useState } from "react";
import { LOGO_PATH, APP_NAME } from "../../utils/constants";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";

/**
 * Top-level auth page.
 * Manages the mode: "login" | "register" | "forgot"
 *
 * Props:
 *   onLogin     — async ({ email, password, role }) => errorString | null
 *   onRegister  — async (formData) => errorString | null
 */
export default function LoginPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [successMsg, setSuccessMsg] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const handleRegisterSuccess = (role) => {
    setSuccessMsg("Conta criada com sucesso! Faça o login.");
    setMode("login");
  };

  const handleForgotClick = (email) => {
    setForgotEmail(email || "");
    setMode("forgot");
    setSuccessMsg("");
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Branding */}
        <div className="login-logo">
          <img
            src={LOGO_PATH}
            alt={`${APP_NAME} logo`}
            style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 2 }}
          />
          <h1>{APP_NAME}</h1>
          <p>Exercícios terapêuticos personalizados</p>
        </div>

        {/* Mode tabs (only for login / register) */}
        {mode !== "forgot" && (
          <div className="tab-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setSuccessMsg("");
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setSuccessMsg("");
              }}
            >
              Criar conta
            </button>
          </div>
        )}

        {/* Forms */}
        {mode === "login" && (
          <LoginForm
            onLogin={onLogin}
            onForgot={handleForgotClick}
            successMessage={successMsg}
          />
        )}

        {mode === "register" && (
          <RegisterForm
            onRegister={onRegister}
            onSuccess={handleRegisterSuccess}
            onSwitchMode={() => setMode("login")}
          />
        )}

        {mode === "forgot" && (
          <ForgotPasswordForm
            initialEmail={forgotEmail}
            onBack={() => setMode("login")}
          />
        )}
      </div>
    </div>
  );
}