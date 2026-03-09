import { useState } from 'react';
import './LoginPage.css';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function LoginPage({ onLogin, onRegister }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login', 'register', 'forgot'

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <img src="/equilibre-icon.png" alt="Equilibre Logo" width="80" height="80" />
          <h1>Equilibre</h1>
          <p>O seu espaço de bem-estar</p>
        </div>

        {activeTab !== 'forgot' && (
          <div className="tab-switch">
            <button 
              className={activeTab === 'login' ? 'active' : ''} 
              onClick={() => setActiveTab('login')}
              type="button"
            >
              Entrar
            </button>
            <button 
              className={activeTab === 'register' ? 'active' : ''} 
              onClick={() => setActiveTab('register')}
              type="button"
            >
              Registar
            </button>
          </div>
        )}

        {/* Renderizado condicional de los formularios */}
        {activeTab === 'login' && (
          <LoginForm onLogin={onLogin} onForgot={() => setActiveTab('forgot')} />
        )}
        
        {activeTab === 'register' && (
          <RegisterForm onRegister={onRegister} />
        )}
        
        {activeTab === 'forgot' && (
          <ForgotPasswordForm onBack={() => setActiveTab('login')} />
        )}
      </div>
    </div>
  );
}