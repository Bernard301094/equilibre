import { useState } from "react";
import styles from "./ModelosPremium.module.css";

export default function RPDView({ patientName }) {
  const [activeStep, setActiveStep] = useState(null);
  const [therapistLogo, setTherapistLogo] = useState(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setTherapistLogo(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const steps = [
    { id: 1, title: "1. Situação (Gatilho)", desc: "Onde você estava? O que estava fazendo? Quem estava com você?" },
    { id: 2, title: "2. Emoções e Sensações", desc: "O que você sentiu? (Ex: Tristeza 80%, Ansiedade 90%). Reações físicas?" },
    { id: 3, title: "3. Pensamento Automático", desc: "O que passou exatamente pela sua cabeça naquele momento?" },
    { id: 4, title: "4. Evidências que APOIAM", desc: "Fatos reais que confirmam o pensamento (sem julgamentos)." },
    { id: 5, title: "5. Evidências que CONTRADIZEM", desc: "Fatos que mostram que o pensamento pode não ser 100% verdadeiro." },
    { id: 6, title: "6. Resposta Alternativa", desc: "Um pensamento mais realista, equilibrado e compassivo." },
  ];

  return (
    <div className={styles.ultraContainer}>
      {/* Cabeçalho de Impressão */}
      <div className={styles.printOnlyHeader}>
        <div className={styles.printBrand}>
          {therapistLogo ? <img src={therapistLogo} alt="Logo" /> : <h2>equilibre</h2>}
        </div>
        <div className={styles.printInfo}>
          <h1>Registro de Pensamentos Disfuncionais (RPD)</h1>
          <p>Paciente: <strong>{patientName}</strong> | Data: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <header className={styles.docHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.docTitle}>Registro de Pensamentos</h1>
          <p className={styles.docSubtitle}>Paciente: <strong>{patientName}</strong></p>
        </div>
        <div className={styles.actions}>
          <div className={styles.logoUploader}>
            <input type="file" accept="image/*" id="logo-rpd" style={{ display: "none" }} onChange={handleLogoUpload} />
            {therapistLogo && <img src={therapistLogo} alt="Logo" className={styles.logoPreview} />}
            <label htmlFor="logo-rpd" className={styles.btnGhost}>
              {therapistLogo ? "Trocar Logo" : "Adicionar Logo"}
            </label>
          </div>
          <button className={styles.btnSolid} onClick={() => window.print()}>
            <span className={styles.printIcon}>↧</span> Salvar Prontuário
          </button>
        </div>
      </header>

      <p className={styles.instruction}>
        Siga as etapas abaixo. Ao focar num quadro, os restantes escurecem para ajudar na reflexão.
      </p>

      <div className={styles.rpdMasonry}>
        {steps.map((step) => {
          const isFocused = activeStep === step.id;
          const isDimmed = activeStep !== null && activeStep !== step.id;

          return (
            <div 
              key={step.id} 
              className={`${styles.rpdCard} ${isFocused ? styles.rpdCardFocused : ''}`}
              style={{ opacity: isDimmed ? 0.4 : 1 }}
              onFocus={() => setActiveStep(step.id)}
              onBlur={() => setActiveStep(null)}
            >
              <div className={styles.rpdCardHeader}>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
              <textarea 
                className={styles.rpdTextarea} 
                placeholder="Escreva aqui..." 
                rows={isFocused ? 5 : 3}
              ></textarea>
            </div>
          );
        })}
      </div>
    </div>
  );
}