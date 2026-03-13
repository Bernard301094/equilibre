import "./ClinicalTypes.css";

export default function ThoughtRecord({ question, value, onChange }) {
  let data = { situation: "", emotion: "", thought: "", intensity: "" };
  try { data = value ? JSON.parse(value) : data; } catch (_) {}

  const update = (field, val) => onChange(JSON.stringify({ ...data, [field]: val }));

  return (
    <div className="tr">
      <p className="ep-question-text">{question.text}</p>
      <p className="tr__subtitle">Preencha o que se aplicar — todos os campos são opcionais</p>

      <div className="tr__field">
        <label className="tr__label">1. Situação</label>
        <p className="tr__hint">O que aconteceu? Onde, quando, com quem?</p>
        <textarea className="tr__textarea" rows={2} placeholder="Ex: Discuti com meu chefe na reunião da manhã."
          value={data.situation} onChange={(e) => update("situation", e.target.value)}
        />
      </div>

      <div className="tr__field">
        <label className="tr__label">2. Emoção</label>
        <p className="tr__hint">O que você sentiu? (tristeza, raiva, medo…)</p>
        <input className="tr__input" placeholder="Ex: Ansiedade, vergonha"
          value={data.emotion} onChange={(e) => update("emotion", e.target.value)}
        />
      </div>

      <div className="tr__field">
        <label className="tr__label">3. Pensamento automático</label>
        <p className="tr__hint">O que passou pela sua cabeça naquele momento?</p>
        <textarea className="tr__textarea" rows={2} placeholder="Ex: \"Eu não sirvo para nada.\""
          value={data.thought} onChange={(e) => update("thought", e.target.value)}
        />
      </div>

      <div className="tr__field">
        <label className="tr__label">4. Intensidade (0–100)</label>
        <p className="tr__hint">Quão intenso foi esse sentimento?</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input type="range" min={0} max={100} step={5}
            className="tr__range"
            value={data.intensity || 0}
            onChange={(e) => update("intensity", e.target.value)}
          />
          <span className="tr__intensity-val">{data.intensity || 0}</span>
        </div>
      </div>
    </div>
  );
}
