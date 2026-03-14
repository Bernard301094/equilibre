import "./ClinicalTypes.css";

// Eixo X: valência (negativo → positivo)
// Eixo Y: ativação (baixa → alta)
const MOOD_GRID_ITEMS = [
  // alta ativação + valência negativa
  { id: "estressado",  label: "Estressado",  emoji: "😠", x: 1, y: 3 },
  { id: "ansioso_g",   label: "Ansioso",     emoji: "😰", x: 2, y: 3 },
  { id: "irritado",    label: "Irritado",    emoji: "😡", x: 1, y: 2 },
  // alta ativação + valência positiva
  { id: "animado",     label: "Animado",     emoji: "😄", x: 4, y: 3 },
  { id: "entusiasmado",label: "Entusiasmado",emoji: "🚀", x: 5, y: 3 },
  { id: "feliz",       label: "Feliz",       emoji: "😊", x: 4, y: 2 },
  // baixa ativação + valência negativa
  { id: "triste_g",    label: "Triste",      emoji: "😢", x: 1, y: 0 },
  { id: "deprimido",   label: "Deprimido",   emoji: "😞", x: 2, y: 0 },
  { id: "exausto",     label: "Exausto",     emoji: "😴", x: 1, y: 1 },
  // baixa ativação + valência positiva
  { id: "calmo_g",     label: "Calmo",       emoji: "🧘", x: 4, y: 0 },
  { id: "relaxado",    label: "Relaxado",    emoji: "😌", x: 5, y: 0 },
  { id: "satisfeito",  label: "Satisfeito",  emoji: "🙂", x: 4, y: 1 },
  // centro
  { id: "neutro_g",    label: "Neutro",      emoji: "😐", x: 3, y: 1 },
];

export default function MoodGrid({ question, value, onChange }) {
  return (
    <div className="mg">
      <p className="ep-question-text">{question.text}</p>

      {/* Eixos */}
      <div className="mg__axis-labels" aria-hidden="true">
        <span className="mg__axis-label mg__axis-label--top">🔥 Alta energia</span>
        <div className="mg__axis-row">
          <span className="mg__axis-label mg__axis-label--left">😔 Negativo</span>
          <span className="mg__axis-label mg__axis-label--right">Positivo 😄</span>
        </div>
        <span className="mg__axis-label mg__axis-label--bottom">😴 Baixa energia</span>
      </div>

      <div className="mg__grid">
        {MOOD_GRID_ITEMS.map((item) => (
          <button
            key={item.id} type="button"
            className={`mg__item${value === item.id ? " mg__item--active" : ""}`}
            style={{ gridColumn: item.x + 1, gridRow: 3 - item.y }}
            onClick={() => onChange(item.id)}
            aria-pressed={value === item.id}
          >
            <span className="mg__item-emoji">{item.emoji}</span>
            <span className="mg__item-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
