import React from "react";
import styles from "./ModelosEquilibreView.module.css";

export default function SOAPView({ patientName }) {
  return (
    <div className={styles.container}>
      <header className={styles.docHeader}>
        <div>
          <h1 className={styles.docTitle}>Resumo de Sessão (SOAP)</h1>
          <p className={styles.docSubtitle}>
            Paciente: <strong>{patientName}</strong> • Data: {new Date().toLocaleDateString()}
          </p>
        </div>
      </header>

      <p className={styles.instruction}>
        Preencha o registro clínico da evolução do paciente utilizando a estrutura padrão SOAP.
      </p>

      {/* Usamos flexbox em coluna para o SOAP, já que os textos costumam ser longos */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div className={styles.inputGroup}>
          <label>S — Subjetivo (Relato do Paciente)</label>
          <textarea 
            placeholder="Qual foi a queixa principal hoje? Como o paciente descreve seus sentimentos, sintomas e vivências desde a última sessão?" 
            rows={4}
          ></textarea>
        </div>
        
        <div className={styles.inputGroup}>
          <label>O — Objetivo (Observações do Terapeuta)</label>
          <textarea 
            placeholder="Fatos observáveis durante a sessão: aparência, comportamento, humor, afeto, nível de atenção, fala, agitação motora, etc." 
            rows={4}
          ></textarea>
        </div>

        <div className={styles.inputGroup}>
          <label>A — Análise / Avaliação</label>
          <textarea 
            placeholder="Sua impressão clínica e raciocínio terapêutico. O paciente apresentou progresso? Há novos insights, padrões identificados ou alteração de hipótese diagnóstica?" 
            rows={4}
          ></textarea>
        </div>

        <div className={styles.inputGroup}>
          <label>P — Plano (Próximos Passos)</label>
          <textarea 
            placeholder="Quais técnicas foram aplicadas hoje? Quais tarefas/exercícios foram combinados para a semana? Qual o foco da próxima sessão?" 
            rows={4}
          ></textarea>
        </div>

      </div>

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={() => window.print()}>
          Exportar PDF para Prontuário
        </button>
      </div>
    </div>
  );
}