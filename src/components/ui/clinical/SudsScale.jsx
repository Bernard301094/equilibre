import "./ClinicalTypes.css";

const SUDS_LABELS = [
  { val: 0,   label: "Nenhum",     color: "#c6f6d5" },
  { val: 10,  label: "Mínimo",    color: "#9ae6b4" },
  { val: 20,  label: "Leve",       color: "#68d391" },
  { val: 30,  label: "Leve-mod.", color: "#f6e05e" },
  { val: 40,  label: "Moderado",  color: "#f6e05e" },
  { val: 50,  label: "Moderado",  color: "#fbd38d" },
  { val: 60,  label: "Consider.", color: "#fbd38d" },
  { val: 70,  label: "Severo",    color: "#fc8181" },
  { val: 80,  label: "Muito sev.",color: "#fc8181" },
  { val: 90,  label: "Extremo",   color: "#fc8181" },
  { val: 100, label: "Insuport.", color: "#e53e3e" },
];

export default function SudsScale({ question, value, onChange }) {
  const num     = Number(value) || 0;
  const current = SUDS_LABELS.reduce((acc, l) => l.val <= num ? l : acc, SUDS_LABELS[0]);

  return (
    <div className="suds">
      <p className="ep-question-text">{question.text}</p>
      <p className="suds__subtitle">SUDS — Subjective Units of Distress Scale (0–100)</p>

      <div className="suds__display" style={{ background: current.color }}>
        <span className="suds__val">{num}</span>
        <span className="suds__label">{current.label}</span>
      </div>

      <input
        type="range" min={0} max={100} step={5}
        className="suds__range"
        value={num}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Nível de sofrimento SUDS"
        aria-valuetext={`${num} — ${current.label}`}
      />

      <div className="suds__ticks" aria-hidden="true">
        {[0, 25, 50, 75, 100].map((v) => (
          <span key={v} className="suds__tick">{v}</span>
        ))}
      </div>

      <div className="suds__legend">
        <span style={{ color: "#276749" }}>0 = Nenhum sofrimento</span>
        <span style={{ color: "#c53030" }}>100 = Insuportável</span>
      </div>
    </div>
  );
}
