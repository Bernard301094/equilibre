import { useState, useRef, useEffect } from "react";
import styles from "./ModelosPremium.module.css";

export default function EscalaClinicaView({ config, patientName }) {
  const [respostas, setRespostas] = useState(Array(config.questions.length).fill(null));
  const [therapistLogo, setTherapistLogo] = useState(null);
  const questionRefs = useRef([]);

  const handleSelect = (qIndex, value) => {
    const novasRespostas = [...respostas];
    novasRespostas[qIndex] = value;
    setRespostas(novasRespostas);

    // Auto-scroll dinâmico e suave para a próxima pergunta
    if (qIndex < config.questions.length - 1) {
      setTimeout(() => {
        questionRefs.current[qIndex + 1]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300); // pequeno delay para o utilizador ver que clicou
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setTherapistLogo(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const calcularScore = () => respostas.reduce((acc, val) => acc + (val || 0), 0);
  const totalRespondidas = respostas.filter(r => r !== null).length;
  const isComplete = totalRespondidas === config.questions.length;
  
  const score = calcularScore();
  const severity = config.getSeverity(score);

  return (
    <div className={styles.ultraContainer}>
      {/* Cabeçalho de Impressão (Só aparece no PDF/Print) */}
      <div className={styles.printOnlyHeader}>
        <div className={styles.printBrand}>
          {therapistLogo ? <img src={therapistLogo} alt="Logo" /> : <h2>equilibre</h2>}
        </div>
        <div className={styles.printInfo}>
          <h1>{config.title}</h1>
          <p>Paciente: <strong>{patientName}</strong> | Data: {new Date().toLocaleDateString()}</p>
          <div className={styles.printScoreBox} style={{ borderColor: severity.color, backgroundColor: severity.bg }}>
            <span>Score Final: {score}</span>
            <strong>Nível: {severity.label}</strong>
          </div>
        </div>
      </div>

      <header className={styles.docHeader}>
        <div className={styles.headerInfo}>
          <h1 className={styles.docTitle}>{config.title}</h1>
          <p className={styles.docSubtitle}>Paciente: <strong>{patientName}</strong></p>
        </div>
        
        <div className={styles.actions}>
          <div className={styles.logoUploader}>
            <input type="file" accept="image/*" id="logo-upload" style={{ display: "none" }} onChange={handleLogoUpload} />
            {therapistLogo && <img src={therapistLogo} alt="Logo" className={styles.logoPreview} />}
            <label htmlFor="logo-upload" className={styles.btnGhost}>
              {therapistLogo ? "Trocar Logo" : "Adicionar Logo"}
            </label>
          </div>
          <button className={styles.btnSolid} disabled={!isComplete} onClick={() => window.print()}>
            <span className={styles.printIcon}>↧</span> Exportar Laudo
          </button>
        </div>
      </header>

      {/* Placar Flutuante Dinâmico */}
      <div className={styles.stickyScoreBoard}>
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${(totalRespondidas / config.questions.length) * 100}%` }}></div>
        </div>
        <div className={styles.scoreDetails} style={{ borderLeftColor: severity.color }}>
          <div className={styles.scoreText}>
            <span className={styles.scoreLabel}>PONTUAÇÃO ATUAL</span>
            <span className={styles.scoreValue} style={{ color: severity.color }}>{score}</span>
          </div>
          <div className={styles.scoreBadge} style={{ backgroundColor: severity.bg, color: severity.color }}>
            {severity.label}
          </div>
        </div>
      </div>

      <div className={styles.questionsList}>
        <p className={styles.instruction}>Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos seguintes problemas?</p>
        
        {config.questions.map((q, idx) => {
          const isAnswered = respostas[idx] !== null;
          const isNext = respostas.findIndex(r => r === null) === idx;
          
          return (
            <div 
              key={idx} 
              ref={el => questionRefs.current[idx] = el}
              className={`${styles.questionCard} ${isAnswered ? styles.answered : ''} ${isNext ? styles.highlightNext : ''}`}
            >
              <h3 className={styles.questionText}><span>{idx + 1}.</span> {q}</h3>
              <div className={styles.optionsGroup}>
                {config.options.map((opt) => (
                  <button
                    key={opt.value}
                    className={`${styles.optionBtn} ${respostas[idx] === opt.value ? styles.optionSelected : ''}`}
                    onClick={() => handleSelect(idx, opt.value)}
                  >
                    <span className={styles.optValue}>{opt.value}</span>
                    <span className={styles.optLabel}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}