import { useState } from "react";
import RodaDaVida from "./RodaDaVida";
import styles from "./ModelosEquilibreView.module.css";

const MODELOS = [
  {
    id: "roda_da_vida",
    icon: "🌀",
    title: "Roda da Vida",
    description: "Avalie o nível de satisfação do paciente em 8 áreas da vida. Gere e baixe o resultado em PDF.",
  },
];

export default function ModelosEquilibreView({ session }) {
  const [activeModelo, setActiveModelo] = useState(null);
  // Futuramente: receber paciente selecionado via props ou context
  const patientName = "Paciente";

  if (activeModelo === "roda_da_vida") {
    return (
      <div className={styles.wrapper}>
        <button className={styles.back} onClick={() => setActiveModelo(null)}>
          ← Voltar aos modelos
        </button>
        <RodaDaVida patientName={patientName} />
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

        {/* Placeholder para futuros modelos */}
        <div className={`${styles.card} ${styles.cardComingSoon}`}>
          <span className={styles.cardIcon}>🔜</span>
          <span className={styles.cardTitle}>Em breve</span>
          <span className={styles.cardDesc}>Novos modelos clínicos serão adicionados aqui.</span>
        </div>
      </div>
    </div>
  );
}
