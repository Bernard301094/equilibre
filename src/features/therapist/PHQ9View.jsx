import { useMemo, useState } from "react";

const OPTIONS = [
  { label: "Nenhuma vez", value: 0 },
  { label: "Vários dias", value: 1 },
  { label: "Mais da metade dos dias", value: 2 },
  { label: "Quase todos os dias", value: 3 },
];

const QUESTIONS = [
  "Pouco interesse ou prazer em fazer as coisas",
  "Sentir-se para baixo, deprimido(a) ou sem esperança",
  "Dificuldade para adormecer, continuar dormindo ou dormir demais",
  "Sentir-se cansado(a) ou com pouca energia",
  "Falta de apetite ou comer demais",
  "Sentir-se mal consigo mesmo(a), ou achar que é um fracasso",
  "Dificuldade de concentração em coisas como ler ou assistir TV",
  "Lentidão para se mover/falar ou inquietação excessiva",
  "Pensamentos de que seria melhor estar morto(a) ou de se ferir",
];

function getSeverity(score) {
  if (score <= 4) return { label: "Mínimo", color: "#22c55e" };
  if (score <= 9) return { label: "Leve", color: "#84cc16" };
  if (score <= 14) return { label: "Moderado", color: "#f59e0b" };
  if (score <= 19) return { label: "Moderadamente grave", color: "#f97316" };
  return { label: "Grave", color: "#ef4444" };
}

export default function PHQ9View({ patientName = "Paciente" }) {
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(0));
  const [notes, setNotes] = useState("");
  const [date] = useState(() => new Date().toLocaleDateString("pt-BR"));

  const total = useMemo(() => answers.reduce((sum, v) => sum + v, 0), [answers]);
  const severity = useMemo(() => getSeverity(total), [total]);

  function updateAnswer(index, value) {
    const next = [...answers];
    next[index] = Number(value);
    setAnswers(next);
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px", fontFamily: "inherit" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>😟 PHQ-9 — Escala de Depressão</h2>
        <p style={{ color: "#6b7280", marginBottom: 2 }}><strong>Paciente:</strong> {patientName}</p>
        <p style={{ color: "#6b7280" }}><strong>Data:</strong> {date}</p>
        <p style={{ marginTop: 8, color: "#374151" }}>
          Nas <strong>últimas 2 semanas</strong>, com que frequência você foi incomodado(a) pelos problemas abaixo?
        </p>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {QUESTIONS.map((question, index) => (
          <div
            key={index}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "16px 20px",
              background: "#fff",
            }}
          >
            <p style={{ marginBottom: 12, fontWeight: 500, color: "#111827" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#f3f4f6",
                fontSize: 13,
                fontWeight: 700,
                marginRight: 10,
              }}>{index + 1}</span>
              {question}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {OPTIONS.map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: answers[index] === option.value ? "2px solid #6366f1" : "1px solid #d1d5db",
                    background: answers[index] === option.value ? "#eef2ff" : "#f9fafb",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    name={`phq9-${index}`}
                    value={option.value}
                    checked={answers[index] === option.value}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    style={{ accentColor: "#6366f1" }}
                  />
                  {option.label} <span style={{ color: "#9ca3af" }}>({option.value})</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: "20px 24px",
          borderRadius: 14,
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <span style={{ color: "#6b7280", fontSize: 14 }}>Pontuação total</span>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>{total}</div>
          </div>
          <div
            style={{
              padding: "6px 20px",
              borderRadius: 999,
              background: severity.color,
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {severity.label}
          </div>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observações clínicas..."
          rows={4}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 14,
            resize: "vertical",
            background: "#fff",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={() => window.print()}
          style={{
            marginTop: 14,
            padding: "12px 24px",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            background: "#111827",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          🖨️ Exportar / Salvar em PDF
        </button>
      </div>
    </div>
  );
}
