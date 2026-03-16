import { useState } from "react";
import RodaDaVida from "./RodaDaVida";
import EscalaClinicaView from "./EscalaClinicaView";
import RPDView from "./RPDView";
import SOAPView from "./SOAPView";
import styles from "./ModelosEquilibreView.module.css";

// Configurações das Escalas Clínicas
const PHQ9_CONFIG = {
  title: "PHQ-9 (Depressão)",
  description: "Questionário de Saúde do Paciente para rastreamento de depressão.",
  options: [
    { label: "Nenhuma vez", value: 0 },
    { label: "Vários dias", value: 1 },
    { label: "Mais da metade dos dias", value: 2 },
    { label: "Quase todos os dias", value: 3 }
  ],
  questions: [
    "Pouco interesse ou pouco prazer em fazer as coisas.",
    "Se sentir para baixo, deprimido ou sem esperança.",
    "Dificuldade para pegar no sono ou permanecer dormindo, ou dormir mais do que o costume.",
    "Se sentir cansado ou com pouca energia.",
    "Falta de apetite ou comendo demais.",
    "Se sentir mal consigo mesmo — ou achar que é um fracasso ou que decepcionou a si mesmo ou à sua família.",
    "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão.",
    "Mover-se ou falar tão devagar que as outras pessoas poderiam notar. Ou o oposto — ser tão agitado ou inquieto que você fica andando de um lado para o outro muito mais do que o costume.",
    "Pensar que seria melhor estar morto ou em se machucar de alguma maneira."
  ],
  getSeverity: (score) => {
    if (score <= 4) return { label: "Mínima", color: "#10b981", bg: "#d1fae5" };
    if (score <= 9) return { label: "Leve", color: "#f59e0b", bg: "#fef3c7" };
    if (score <= 14) return { label: "Moderada", color: "#f97316", bg: "#ffedd5" };
    if (score <= 19) return { label: "Moderadamente Grave", color: "#ef4444", bg: "#fee2e2" };
    return { label: "Grave", color: "#b91c1c", bg: "#fecaca" };
  }
};

const GAD7_CONFIG = {
  title: "GAD-7 (Ansiedade)",
  description: "Escala de Transtorno de Ansiedade Generalizada.",
  options: [
    { label: "Nenhuma vez", value: 0 },
    { label: "Vários dias", value: 1 },
    { label: "Mais da metade dos dias", value: 2 },
    { label: "Quase todos os dias", value: 3 }
  ],
  questions: [
    "Sentir-se nervoso, ansioso ou muito tenso.",
    "Não ser capaz de impedir ou de controlar as preocupações.",
    "Preocupar-se muito com diversas coisas.",
    "Dificuldade para relaxar.",
    "Ficar tão agitado que se torna difícil permanecer sentado.",
    "Tornar-se facilmente aborrecido ou irritado.",
    "Sentir medo como se algo horrível fosse acontecer."
  ],
  getSeverity: (score) => {
    if (score <= 4) return { label: "Mínima", color: "#10b981", bg: "#d1fae5" };
    if (score <= 9) return { label: "Leve", color: "#f59e0b", bg: "#fef3c7" };
    if (score <= 14) return { label: "Moderada", color: "#f97316", bg: "#ffedd5" };
    return { label: "Grave", color: "#ef4444", bg: "#fee2e2" };
  }
};

const CATEGORIAS = [
  {
    nome: "Avaliação & Diagnóstico",
    modelos: [
      { id: "phq9", icon: "📋", title: "PHQ-9", description: "Rastreio e mensuração de severidade depressiva (9 itens)." },
      { id: "gad7", icon: "😰", title: "GAD-7", description: "Avaliação rápida de ansiedade generalizada (7 itens)." },
      { id: "roda_da_vida", icon: "🎯", title: "Roda da Vida", description: "Avaliação visual de satisfação em 8 áreas da vida." },
    ]
  },
  {
    nome: "TCC (Terapia Cognitivo-Comportamental)",
    modelos: [
      { id: "rpd", icon: "🧠", title: "Registro de Pensamentos (RPD)", description: "Estruturação de pensamentos automáticos e evidências." },
    ]
  },
  {
    nome: "Planejamento & Sessão",
    modelos: [
      { id: "soap", icon: "📝", title: "Resumo de Sessão (SOAP)", description: "Registro clínico padronizado (Subjetivo, Objetivo, Análise, Plano)." },
    ]
  }
];

export default function ModelosEquilibreView({ session }) {
  const [activeModelo, setActiveModelo] = useState(null);
  const patientName = "Paciente Exemplo";

  const renderActiveModel = () => {
    const backBtn = (
      <button className={styles.backButton} onClick={() => setActiveModelo(null)}>
        <span className={styles.backIcon}>←</span> Voltar ao Acervo
      </button>
    );

    switch (activeModelo) {
      case "roda_da_vida": return <><div className={styles.navBar}>{backBtn}</div><RodaDaVida patientName={patientName} /></>;
      case "phq9": return <><div className={styles.navBar}>{backBtn}</div><EscalaClinicaView config={PHQ9_CONFIG} patientName={patientName} /></>;
      case "gad7": return <><div className={styles.navBar}>{backBtn}</div><EscalaClinicaView config={GAD7_CONFIG} patientName={patientName} /></>;
      case "rpd": return <><div className={styles.navBar}>{backBtn}</div><RPDView patientName={patientName} /></>;
      case "soap": return <><div className={styles.navBar}>{backBtn}</div><SOAPView patientName={patientName} /></>;
      default: return null;
    }
  };

  if (activeModelo) {
    return <div className={styles.modelContainer}>{renderActiveModel()}</div>;
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>🧩</div>
        <div>
          <h1 className={styles.title}>Modelos Equilibre</h1>
          <p className={styles.subtitle}>Acervo de ferramentas clínicas validadas. Preencha em sessão e exporte para o prontuário.</p>
        </div>
      </header>

      <div className={styles.categories}>
        {CATEGORIAS.map((cat, idx) => (
          <section key={idx} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{cat.nome}</h2>
            <div className={styles.grid}>
              {cat.modelos.map((modelo) => (
                <div key={modelo.id} className={styles.card} onClick={() => setActiveModelo(modelo.id)}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardIcon}>{modelo.icon}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{modelo.title}</h3>
                    <p className={styles.cardDesc}>{modelo.description}</p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardAction}>Abrir ferramenta</span>
                    <span className={styles.arrow}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}