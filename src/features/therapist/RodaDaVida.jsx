import { useRef, useState } from "react";
import styles from "./RodaDaVida.module.css";

const DEFAULT_AREAS = [
  { key: "0", label: "Saúde Física" },
  { key: "1", label: "Família" },
  { key: "2", label: "Amor" },
  { key: "3", label: "Finanças" },
  { key: "4", label: "Carreira" },
  { key: "5", label: "Intelecto" },
  { key: "6", label: "Lazer" },
  { key: "7", label: "Espiritualidade" },
];

// Paleta Moderna e Profissional (Inspirada no Tailwind)
const AREA_COLORS = [
  { start: "#34d399", end: "#10b981" }, // Esmeralda
  { start: "#60a5fa", end: "#3b82f6" }, // Azul
  { start: "#fb7185", end: "#e11d48" }, // Rose
  { start: "#fbbf24", end: "#d97706" }, // Âmbar
  { start: "#a78bfa", end: "#7c3aed" }, // Violeta
  { start: "#2dd4bf", end: "#0d9488" }, // Teal
  { start: "#f472b6", end: "#db2777" }, // Rosa
  { start: "#a3e635", end: "#65a30d" }, // Lima
];

const CX = 200, CY = 200, MAX_R = 150;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startAngle, endAngle) {
  if (r <= 0) return "";
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

function LabelText({ area, i, angle, maxR, color }) {
  const p = polarToCartesian(CX, CY, maxR + 32, angle);
  const words = area.label.split(" ");
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(" ");
  const line2 = words.slice(mid).join(" ");

  return (
    <text
      x={p.x} y={p.y}
      textAnchor="middle" dominantBaseline="middle"
      fontSize="11" fill="#475569"
      fontFamily="Inter, sans-serif" fontWeight="700"
    >
      {words.length > 1 ? (
        <tspan>
          <tspan x={p.x} dy="-6">{line1}</tspan>
          <tspan x={p.x} dy="14">{line2}</tspan>
        </tspan>
      ) : (
        area.label
      )}
    </text>
  );
}

export default function RodaDaVida({ patientName = "Paciente" }) {
  const [areas, setAreas] = useState(DEFAULT_AREAS);
  const [values, setValues] = useState(
    Object.fromEntries(DEFAULT_AREAS.map((a) => [a.key, 5]))
  );
  const [editingKey, setEditingKey] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [therapistLogo, setTherapistLogo] = useState(null); // Estado para o logótipo do terapeuta
  const svgRef = useRef(null);

  const total = areas.length;
  const sliceAngle = 360 / total;

  const handleValueChange = (key, val) => setValues((prev) => ({ ...prev, [key]: Number(val) }));
  const handleLabelChange = (key, newLabel) => setAreas((prev) => prev.map((a) => a.key === key ? { ...a, label: newLabel } : a));

  const handleReset = () => {
    setAreas(DEFAULT_AREAS);
    setValues(Object.fromEntries(DEFAULT_AREAS.map((a) => [a.key, 5])));
    setEditingKey(null);
  };

  // Função para lidar com o upload da imagem do logótipo
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTherapistLogo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const svg = svgRef.current;
      const svgStr = new XMLSerializer().serializeToString(svg);
      const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }));

      const img = new Image();
      img.onload = () => {
        // Aumentamos a resolução do Canvas para o gráfico ficar perfeito na impressão
        const canvas = document.createElement("canvas");
        canvas.width = 800; canvas.height = 800; 
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 800, 800);
        ctx.drawImage(img, 0, 0, 800, 800);
        URL.revokeObjectURL(url);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const today = new Date().toLocaleDateString("pt-BR");

        // --- PALETA DE CORES DO PDF (Minimalista/Clínica) ---
        const corTextoEscuro = [15, 23, 42];  // #0f172a
        const corTextoMedio = [71, 85, 105];  // #475569
        const corTextoClaro = [100, 116, 139]; // #64748b
        const corDestaque = [106, 153, 124];  // #6a997c (Equilibre)
        const corFundoCinza = [248, 250, 252]; // #f8fafc
        const corLinha = [226, 232, 240];     // #e2e8f0

        // 1. CABEÇALHO SUPERIOR
        pdf.setFillColor(...corTextoEscuro);
        pdf.rect(0, 0, pageW, 8, "F"); // Tarja fina
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.setTextColor(...corTextoEscuro);
        pdf.text("Roda da Vida", 14, 24);
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(...corTextoMedio);
        pdf.text("Avaliação Sistêmica de Satisfação Pessoal", 14, 30);

        // Marca/Logótipo flutuante (Logótipo do Terapeuta ou Padrão)
        if (therapistLogo) {
          try {
            const imgProps = pdf.getImageProperties(therapistLogo);
            const maxLogoHeight = 14; // Altura máxima em mm
            const maxLogoWidth = 40;  // Largura máxima em mm
            
            // Cálculo de proporção para não distorcer o logo
            let finalHeight = (imgProps.height * maxLogoWidth) / imgProps.width;
            let finalWidth = maxLogoWidth;

            if (finalHeight > maxLogoHeight) {
              finalHeight = maxLogoHeight;
              finalWidth = (imgProps.width * maxLogoHeight) / imgProps.height;
            }

            // Alinhar à direita
            const xPos = pageW - 14 - finalWidth;
            // Centralizar verticalmente na área do cabeçalho (aproximadamente Y = 16)
            const yPos = 24 - (finalHeight / 2);

            pdf.addImage(therapistLogo, "PNG", xPos, yPos, finalWidth, finalHeight);
          } catch (e) {
            console.error("Erro ao processar o logótipo para o PDF", e);
            // Fallback para texto caso a imagem falhe
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.setTextColor(...corDestaque);
            pdf.text("equilibre", pageW - 14, 24, { align: "right" });
          }
        } else {
          // Logótipo padrão Equilibre em texto
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(...corDestaque);
          pdf.text("equilibre", pageW - 14, 24, { align: "right" });
        }

        pdf.setDrawColor(...corLinha);
        pdf.setLineWidth(0.5);
        pdf.line(14, 35, pageW - 14, 35);

        // 2. BLOCO DE IDENTIFICAÇÃO DO PACIENTE
        pdf.setFillColor(...corFundoCinza);
        pdf.roundedRect(14, 40, pageW - 28, 18, 2, 2, "F");
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(...corTextoClaro);
        pdf.text("PACIENTE", 20, 46);
        pdf.setFontSize(11);
        pdf.setTextColor(...corTextoEscuro);
        pdf.text(patientName, 20, 52);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(...corTextoClaro);
        pdf.text("DATA DA AVALIAÇÃO", 120, 46);
        pdf.setFontSize(11);
        pdf.setTextColor(...corTextoEscuro);
        pdf.text(today, 120, 52);

        // 3. CONTEÚDO: GRÁFICO (Esquerda) E TABELA (Direita)
        pdf.addImage(imgData, "PNG", 14, 70, 95, 95);

        // Título da Tabela
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...corTextoEscuro);
        pdf.text("Métricas por Área", 120, 78);

        // Tabela de Resultados
        let yPos = 88;
        areas.forEach((area, i) => {
          const score = values[area.key];
          
          // Fundo zebrado
          if (i % 2 === 0) {
            pdf.setFillColor(...corFundoCinza);
            pdf.rect(118, yPos - 6, pageW - 118 - 14, 10, "F");
          }

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(...corTextoMedio);
          pdf.text(area.label.toUpperCase(), 122, yPos);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(...corTextoEscuro);
          pdf.text(score.toString() + " / 10", pageW - 20, yPos, { align: "right" });

          yPos += 10;
        });

        // 4. ÁREA DE OBSERVAÇÕES CLÍNICAS (Com pautas)
        const obsY = 185;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...corTextoEscuro);
        pdf.text("Observações Clínicas e Plano de Ação", 14, obsY);

        pdf.setDrawColor(...corLinha);
        pdf.setLineWidth(0.3);
        // Desenha 7 linhas para escrita manual
        for (let i = 0; i < 7; i++) {
          const linhaY = obsY + 10 + (i * 9);
          pdf.line(14, linhaY, pageW - 14, linhaY);
        }

        // 5. ASSINATURA E RODAPÉ
        const footerY = 270;
        pdf.setDrawColor(148, 163, 184); // Linha escura para assinatura
        pdf.setLineWidth(0.5);
        pdf.line(pageW / 2 - 35, footerY, pageW / 2 + 35, footerY);
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(...corTextoMedio);
        pdf.text("Assinatura do Profissional", pageW / 2, footerY + 5, { align: "center" });

        pdf.setFontSize(7);
        pdf.setTextColor(...corTextoClaro);
        pdf.text("Documento gerado de forma confidencial pela plataforma Equilibre.", pageW / 2, pageH - 10, { align: "center" });

        // Gera e descarrega o ficheiro
        pdf.save(`Avaliacao_Roda_da_Vida_${patientName.replace(/\s+/g, "_")}_${today.replace(/\//g, "-")}.pdf`);
        setDownloading(false);
      };
      img.src = url;
    } catch (err) {
      console.error("PDF error:", err);
      setDownloading(false);
    }
  };

  return (
    <div className={styles.premiumContainer}>
      <header className={styles.docHeader}>
        <div>
          <h1 className={styles.docTitle}>Roda da Vida</h1>
          <p className={styles.docSubtitle}>Paciente: <strong>{patientName}</strong></p>
        </div>
        <div className={styles.actions}>
          
          {/* Seção de Upload de Logótipo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderRight: "2px solid #e2e8f0", paddingRight: "16px", marginRight: "8px" }}>
            <input
              type="file"
              accept="image/*"
              id="logo-upload"
              style={{ display: "none" }}
              onChange={handleLogoUpload}
            />
            {therapistLogo && (
              <img src={therapistLogo} alt="Logótipo do Terapeuta" style={{ height: "28px", borderRadius: "4px", objectFit: "contain", maxWidth: "80px" }} />
            )}
            <label htmlFor="logo-upload" className={styles.btnOutline} style={{ cursor: "pointer", margin: 0, padding: "8px 12px", fontSize: "0.85rem" }}>
              {therapistLogo ? "Trocar Logo" : "Adicionar Logo"}
            </label>
            {therapistLogo && (
              <button onClick={() => setTherapistLogo(null)} className={styles.btnOutline} style={{ padding: "8px", borderColor: "#fca5a5", color: "#ef4444", fontSize: "0.85rem" }} title="Remover Logo">
                ✕
              </button>
            )}
          </div>

          <button onClick={handleReset} className={styles.btnOutline}>Resetar</button>
          <button onClick={handleDownloadPDF} disabled={downloading} className={styles.btnPrimary}>
            {downloading ? "Gerando..." : "⬇ Exportar PDF"}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {/* Gráfico */}
        <div className={styles.chartArea}>
          <svg ref={svgRef} viewBox="0 0 400 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Filtro de Sombra Profissional */}
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.08" />
              </filter>
              {/* Gradientes para cada área */}
              {AREA_COLORS.map((c, i) => (
                <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={c.start} />
                  <stop offset="100%" stopColor={c.end} />
                </linearGradient>
              ))}
            </defs>

            {/* Fundo do Gráfico (Anéis Suaves) */}
            {[10, 8, 6, 4, 2].map((level, li) => (
              <circle key={level} cx={CX} cy={CY} r={(level / 10) * MAX_R}
                fill={li === 0 ? "#f8fafc" : "none"}
                stroke="#e2e8f0" strokeWidth={li === 0 ? "2" : "1"}
                strokeDasharray={li !== 0 ? "4,4" : "none"}
              />
            ))}

            {/* Eixos Guias */}
            {areas.map((_, i) => {
              const end = polarToCartesian(CX, CY, MAX_R, sliceAngle * i);
              return <line key={`axis-${i}`} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth="1.5" />;
            })}

            {/* Fatias Coloridas (O Radar) */}
            <g filter="url(#shadow)">
              {areas.map((a, i) => {
                const r = (values[a.key] / 10) * MAX_R;
                const d = slicePath(CX, CY, r, sliceAngle * i, sliceAngle * (i + 1));
                return d ? (
                  <path key={`slice-${a.key}`} d={d}
                    fill={`url(#grad-${i})`} fillOpacity="0.85"
                    stroke="#ffffff" strokeWidth="3" strokeLinejoin="round"
                    style={{ transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
                  />
                ) : null;
              })}
            </g>

            {/* Centro Branco para dar visual de Rosquinha/Donut moderno */}
            <circle cx={CX} cy={CY} r={12} fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />

            {/* Marcadores de Valor e Labels */}
            {areas.map((a, i) => {
              const p = polarToCartesian(CX, CY, (values[a.key] / 10) * MAX_R, sliceAngle * (i + 0.5));
              const isActive = values[a.key] > 0;
              return (
                <g key={`marker-${a.key}`}>
                  {isActive && (
                    <>
                      <circle cx={p.x} cy={p.y} r={10} fill="#ffffff" stroke={AREA_COLORS[i].end} strokeWidth="2" />
                      <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                        fontSize="9" fill={AREA_COLORS[i].end} fontFamily="sans-serif" fontWeight="800">
                        {values[a.key]}
                      </text>
                    </>
                  )}
                  <LabelText area={a} i={i} angle={sliceAngle * (i + 0.5)} maxR={MAX_R} color={AREA_COLORS[i].end} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Controles (Sliders) Premium */}
        <div className={styles.slidersArea}>
          <h3 className={styles.slidersTitle}>Avaliação por Área</h3>
          <div className={styles.slidersList}>
            {areas.map((area, i) => (
              <div key={area.key} className={styles.sliderRow}>
                <div className={styles.labelGroup}>
                  <div className={styles.colorDot} style={{ background: AREA_COLORS[i].end }}></div>
                  {editingKey === area.key ? (
                    <input autoFocus className={styles.editInput} value={area.label}
                      onChange={(e) => handleLabelChange(area.key, e.target.value)}
                      onBlur={() => setEditingKey(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingKey(null)}
                      maxLength={20}
                    />
                  ) : (
                    <span className={styles.areaText} onClick={() => setEditingKey(area.key)}>
                      {area.label} <span className={styles.editIcon}>✏️</span>
                    </span>
                  )}
                  <span className={styles.scoreValue} style={{ color: AREA_COLORS[i].end }}>{values[area.key]}</span>
                </div>
                
                <input
                  type="range" min={0} max={10} step={1}
                  value={values[area.key]}
                  onChange={(e) => handleValueChange(area.key, e.target.value)}
                  className={styles.premiumRange}
                  style={{ '--track-color': AREA_COLORS[i].end }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}