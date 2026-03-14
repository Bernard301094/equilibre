import { useState } from "react";
import { EMOTION_WHEEL } from "../../../utils/constants";
import "./ClinicalTypes.css";

export default function EmotionWheel({ question, value, onChange }) {
  const [expanded, setExpanded] = useState(null); // parent id sendo expandido

  const parents  = EMOTION_WHEEL.filter((e) => !e.parent);
  const children = (parentId) => EMOTION_WHEEL.filter((e) => e.parent === parentId);
  const selected = EMOTION_WHEEL.find((e) => e.id === value);

  return (
    <div className="ew">
      <p className="ep-question-text">{question.text}</p>

      {selected && (
        <div className="ew__selected" style={{ background: selected.color }}>
          <span className="ew__selected-emoji">{selected.emoji}</span>
          <span className="ew__selected-label">{selected.label}</span>
          <button className="ew__clear" onClick={() => { onChange(""); setExpanded(null); }} aria-label="Limpar">×</button>
        </div>
      )}

      <div className="ew__parents">
        {parents.map((p) => (
          <div key={p.id} className="ew__parent-group">
            <button
              type="button"
              className={`ew__parent-btn${expanded === p.id ? " ew__parent-btn--open" : ""}${value === p.id ? " ew__parent-btn--selected" : ""}`}
              style={{ "--ew-color": p.color }}
              onClick={() => {
                setExpanded((prev) => prev === p.id ? null : p.id);
                onChange(p.id);
              }}
              aria-expanded={expanded === p.id}
            >
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </button>

            {expanded === p.id && (
              <div className="ew__children">
                {children(p.id).map((c) => (
                  <button
                    key={c.id} type="button"
                    className={`ew__child-btn${value === c.id ? " ew__child-btn--selected" : ""}`}
                    style={{ "--ew-child-color": c.color }}
                    onClick={() => onChange(c.id)}
                    aria-pressed={value === c.id}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
