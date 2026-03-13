import { BODY_REGIONS } from "../../../utils/constants";
import "./ClinicalTypes.css";

export default function BodyMap({ question, value, onChange }) {
  const selected = value ? value.split("|").filter(Boolean) : [];

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    onChange(next.join("|"));
  };

  const labelFor = (id) => BODY_REGIONS.find((r) => r.id === id)?.label ?? id;

  return (
    <div className="bm">
      <p className="ep-question-text">{question.text}</p>
      <p className="bm__hint">Toque nas regiões onde você sente algo</p>

      {/* Figura humana simplificada via SVG */}
      <div className="bm__figure-wrap">
        <svg viewBox="0 0 100 100" className="bm__svg" aria-label="Mapa corporal">
          {/* silhueta simplificada */}
          <ellipse cx="50" cy="8" rx="7" ry="7" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="43" y="15" width="14" height="4" rx="2" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="38" y="19" width="24" height="22" rx="4" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="26" y="19" width="10" height="20" rx="4" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="64" y="19" width="10" height="20" rx="4" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="44" y="41" width="12" height="18" rx="3" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="38" y="59" width="10" height="18" rx="3" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="52" y="59" width="10" height="18" rx="3" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="36" y="77" width="10" height="10" rx="2" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />
          <rect x="54" y="77" width="10" height="10" rx="2" fill="var(--bm-body, #e2e8f0)" stroke="var(--border,#cbd5e0)" strokeWidth="0.8" />

          {/* Pontos clícáveis */}
          {BODY_REGIONS.map((r) => {
            const isSelected = selected.includes(r.id);
            return (
              <g key={r.id} onClick={() => toggle(r.id)} style={{ cursor: "pointer" }}>
                <circle
                  cx={r.x} cy={r.y} r={4.5}
                  fill={isSelected ? "#e53e3e" : "rgba(255,255,255,0.7)"}
                  stroke={isSelected ? "#c53030" : "#a0aec0"}
                  strokeWidth="1"
                  className="bm__dot"
                />
                {isSelected && (
                  <text x={r.x} y={r.y + 0.8} textAnchor="middle" dominantBaseline="middle"
                    fontSize="4" fill="white" style={{ pointerEvents: "none" }}>✓</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tags das regiões selecionadas */}
      {selected.length > 0 && (
        <div className="bm__tags">
          {selected.map((id) => (
            <span key={id} className="bm__tag">
              {labelFor(id)}
              <button onClick={() => toggle(id)} className="bm__tag-remove" aria-label={`Remover ${labelFor(id)}`}>×</button>
            </span>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <p className="bm__empty">Nenhuma região selecionada</p>
      )}
    </div>
  );
}
