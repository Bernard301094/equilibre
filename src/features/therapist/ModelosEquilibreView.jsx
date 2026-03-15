import { useState } from "react";
import RodaDaVida from "./RodaDaVida";
import PHQ9View from "./PHQ9View";
import GAD7View from "./GAD7View";
import styles from "./ModelosEquilibreView.module.css";

const MODELOS = [
  {
    id: "roda_da_vida",
    icon: "🌀",
    title: "Roda da Vida",
    description: "Avalie o nível de satisfação do paciente em 8 áreas da vida. Gere e baixe o resultado em PDF.",
  },
  {
    id: "phq9",
    icon: "😟",
    title: "PHQ-9",
    description: "Triagem de sintomas depressivos com pontuação automática e exportação em PDF.",
  },
  {
    id: "gad7",
    icon: "😰",
    title: "GAD-7",
    description: "Avaliação breve de ansiedade com resultado automático e exportação em PDF.",
  },
];

export default function ModelosEquilibreView({ session }) {
  const [activeModelo, setActiveModelo] = useState(null);
  const patientName = "Paciente";

  const backButton = (
    <button className={styles.back} onClick={() => setActiveModelo(null)}>
      ← Voltar aos modelos
    </button>
  );

  if (activeModelo === "roda_da_vida") {
    return (
      <div className={styles.wrapper}>
        {backButton}
        <RodaDaVida patientName={patientName} />
      </div>
    );
  }

  if (activeModelo === "phq9") {
    return (
      <div className={styles.wrapper}>
        {backButton}
        <PHQ9View patientName={patientName} />
      </div>
    );
  }

  if (activeModelo === "gad7") {
    return (
      <div className={styles.wrapper}>
        {backButton}
        <GAD7View patientName={patientName} />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>🧩 Modelos Equilibre</h1>
        <p className={styles.subtitle}>
          Ferramentas clínicas prontas para usar em sessão e exportar como PDF.
        </p>
      </div>

      <div className={styles.grid}>
        {MODELOS.map((modelo) => (
          <button
            key={modelo.id}
            className={styles.card}
            onClick={() => setActiveModelo(modelo.id)}
          >
            <span className={styles.cardIcon}>{modelo.icon}</span>
            <span className={styles.cardTitle}>{modelo.title}</span>
            <span className={styles.cardDesc}>{modelo.description}</span>
            <span className={styles.cardCta}>Abrir →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
