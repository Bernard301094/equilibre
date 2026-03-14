import "./ClinicalTypes.css";

export default function GratitudeList({ question, value, onChange }) {
  let data = { g1: "", g2: "", g3: "" };
  try { data = value ? JSON.parse(value) : data; } catch (_) {}

  const update = (field, val) => onChange(JSON.stringify({ ...data, [field]: val }));

  return (
    <div className="gl">
      <p className="ep-question-text">{question.text}</p>
      <p className="gl__subtitle">Escreva 3 coisas pelas quais você é grato(a) hoje. Podem ser pequenas!</p>

      {["g1", "g2", "g3"].map((key, i) => (
        <div key={key} className="gl__item">
          <span className="gl__num">{i + 1}</span>
          <input
            className="gl__input"
            placeholder={[
              "Ex: Acordei com saúde",
              "Ex: Tive uma conversa agradavel",
              "Ex: O sol estava bonito hoje",
            ][i]}
            value={data[key]}
            onChange={(e) => update(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
