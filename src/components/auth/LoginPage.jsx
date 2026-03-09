import { useState } from "react";
import { LOGO_PATH, APP_NAME } from "../../utils/constants";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import "./LoginPage.css";

export default function LoginPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [successMsg, setSuccessMsg] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const handleRegisterSuccess = () => {
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
      <div className="login-bg__overlay" aria-hidden="true" />

      <div className="login-card">
        <div className="login-card__branding">
          <img
            src={LOGO_PATH}
            alt={`${APP_NAME} logo`}
            className="login-card__logo"
          />
          <h1 className="login-card__title">{APP_NAME}</h1>
          <p className="login-card__subtitle">
            Exercícios terapêuticos personalizados
          </p>
        </div>

        {mode !== "forgot" && (
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tabs__btn${mode === "login" ? " login-tabs__btn--active" : ""}`}
              onClick={() => { setMode("login"); setSuccessMsg(""); }}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`login-tabs__btn${mode === "register" ? " login-tabs__btn--active" : ""}`}
              onClick={() => { setMode("register"); setSuccessMsg(""); }}
            >
              Criar conta
            </button>
          </div>
        )}

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