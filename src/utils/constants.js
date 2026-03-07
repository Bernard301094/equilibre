// ─── Application ──────────────────────────────────────────────────────────────

export const APP_NAME = "Equilibre";
export const LOGO_PATH = "/equilibre-icon.png";

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLE = /** @type {const} */ ({
  THERAPIST: "therapist",
  PATIENT: "patient",
});

// ─── Exercise categories ──────────────────────────────────────────────────────

export const CATEGORIES = [
  "Ansiedade",
  "Bem-estar",
  "Mindfulness",
  "Autoconhecimento",
  "Relacionamentos",
  "Outro",
];

export const CATEGORY_CLASS = {
  Mindfulness: "mindfulness",
  "Bem-estar": "bem-estar",
  Ansiedade: "ansiedade",
  Autoconhecimento: "autoconhecimento",
  Relacionamentos: "relacionamentos",
  Outro: "outro",
};

// ─── Question types ───────────────────────────────────────────────────────────

export const QUESTION_TYPES = [
  { value: "open", label: "Resposta aberta" },
  { value: "scale", label: "Escala (0–10)" },
  { value: "reflect", label: "Reflexão (opcional)" },
  { value: "instruction", label: "Instrução (sem resposta)" },
];

// ─── Diary moods ──────────────────────────────────────────────────────────────

export const MOODS = [
  { val: 1, emoji: "😔", label: "Difícil" },
  { val: 2, emoji: "😕", label: "Baixo" },
  { val: 3, emoji: "😐", label: "Neutro" },
  { val: 4, emoji: "🙂", label: "Bem" },
  { val: 5, emoji: "😄", label: "Ótimo" },
];

// ─── Behavioral Activation pillars ───────────────────────────────────────────

export const BA_PILLARS = [
  { name: "Autocuidado",       icon: "🧘", desc: "Cuidar de si" },
  { name: "Responsabilidades", icon: "📋", desc: "Deveres diários" },
  { name: "Lazer",             icon: "🎨", desc: "Diversão e hobbies" },
  { name: "Movimento",         icon: "🏃", desc: "Corpo ativo" },
  { name: "Socialização",      icon: "🗣️", desc: "Conexão com outros" },
];

export const BA_CATEGORIES = BA_PILLARS.map((p) => p.name);

export const BA_DIFFICULTIES = ["Muito fácil", "Fácil", "Moderado", "Desafiador"];

export const BA_AVOIDANCE_REASONS = [
  "Falta de energia",
  "Esqueci",
  "Falta de tempo",
  "Evitei / Ansiedade",
  "Outro imprevisto",
];

// ─── Plant gamification stages ────────────────────────────────────────────────

export const PLANT_STAGES = [
  { minStreak: 0,  icon: "🌰", label: "Semente",        color: "#8b5a2b", desc: "Pronta para crescer." },
  { minStreak: 1,  icon: "🌱", label: "Brotinho",       color: "#a8d5ba", desc: "Começando a brotar." },
  { minStreak: 3,  icon: "🌿", label: "Planta Jovem",   color: "#7abd8c", desc: "Ganhando folhas." },
  { minStreak: 6,  icon: "🪴", label: "Planta no Vaso", color: "#4a9c5d", desc: "Crescendo forte." },
  { minStreak: 10, icon: "🌳", label: "Árvore Firme",   color: "#2d7a3a", desc: "Raízes profundas." },
  { minStreak: 15, icon: "🌸", label: "Árvore Florida", color: "#e88fb4", desc: "Seu jardim está lindo!" },
];

/** @param {number} streak */
export function getPlantStage(streak) {
  let stage = PLANT_STAGES[0];
  for (const s of PLANT_STAGES) {
    if (streak >= s.minStreak) stage = s;
  }
  return stage;
}

// ─── Diary risk words (for therapist alert) ───────────────────────────────────

export const DIARY_RISK_WORDS = [
  "triste",
  "desespero",
  "pânico",
  "morte",
  "ansiedade forte",
  "chorar",
  "não aguento",
  "suicídio",
  "angústia",
  "crise",
];

// ─── Seed exercises ───────────────────────────────────────────────────────────

export const SEED_EXERCISES = [
  {
    id: "ex1",
    title: "Respiração 4-7-8",
    category: "Ansiedade",
    description: "Técnica de respiração para reduzir a ansiedade rapidamente.",
    questions: [
      { id: "q1", type: "reflect",     text: "Antes de começar: em uma palavra, como você está se sentindo agora?" },
      { id: "q2", type: "instruction", text: "🌬️ Inspire pelo nariz contando até 4 — segure o ar contando até 7 — expire pela boca contando até 8. Repita 3 vezes." },
      { id: "q3", type: "scale",       text: "De 0 a 10, qual é o seu nível de ansiedade ANTES do exercício?" },
      { id: "q4", type: "scale",       text: "De 0 a 10, qual é o seu nível de ansiedade APÓS o exercício?" },
      { id: "q5", type: "open",        text: "O que você percebeu no seu corpo durante a respiração? Descreva livremente." },
    ],
  },
  {
    id: "ex2",
    title: "Registro de Pensamentos",
    category: "Ansiedade",
    description: "Identificar e questionar pensamentos automáticos negativos.",
    questions: [
      { id: "q1", type: "open",  text: "Descreva a situação que gerou ansiedade ou desconforto." },
      { id: "q2", type: "open",  text: "Que pensamento automático surgiu nesse momento?" },
      { id: "q3", type: "scale", text: "Qual a intensidade desse sentimento de 0 a 10?" },
      { id: "q4", type: "open",  text: "Que evidências confirmam esse pensamento?" },
      { id: "q5", type: "open",  text: "Que evidências contradizem esse pensamento?" },
      { id: "q6", type: "open",  text: "Como você poderia pensar de forma mais equilibrada sobre essa situação?" },
    ],
  },
  {
    id: "ex3",
    title: "Gratidão Diária",
    category: "Bem-estar",
    description: "Prática de foco no positivo para fortalecer o bem-estar emocional.",
    questions: [
      { id: "q1", type: "open",    text: "Liste 3 coisas pelas quais você é grato(a) hoje (podem ser pequenas)." },
      { id: "q2", type: "open",    text: "Qual dessas coisas te tocou mais profundamente? Por quê?" },
      { id: "q3", type: "reflect", text: "Feche os olhos por 30 segundos e sinta essa gratidão no seu corpo. Onde você a percebe fisicamente?" },
      { id: "q4", type: "open",    text: "Como você poderia trazer mais momentos assim para a sua semana?" },
    ],
  },
  {
    id: "ex4",
    title: "Escaneamento Corporal",
    category: "Mindfulness",
    description: "Atenção plena ao corpo para reduzir tensão e aumentar presença.",
    questions: [
      { id: "q1", type: "instruction", text: "🧘 Deite-se ou sente-se confortavelmente. Feche os olhos. Comece percebendo seus pés — depois pernas, quadril, abdômen, peito, mãos, braços, ombros, pescoço e cabeça. Leve 3 minutos nesse percurso." },
      { id: "q2", type: "open",        text: "Em quais partes do corpo você sentiu mais tensão ou desconforto?" },
      { id: "q3", type: "open",        text: "Em quais partes você sentiu leveza ou relaxamento?" },
      { id: "q4", type: "scale",       text: "Como você avalia sua qualidade de presença durante o exercício? (0 = muito distraído, 10 = totalmente presente)" },
      { id: "q5", type: "open",        text: "O que esse exercício revelou sobre como você está carregando seu dia no corpo?" },
    ],
  },
];

// ─── Token refresh interval ───────────────────────────────────────────────────

/** milliseconds — refresh JWT 10 min before typical 60-min expiry */
export const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

// ─── LocalStorage keys ────────────────────────────────────────────────────────

export const LS_SESSION_KEY = "equilibre_session";
export const LS_SEEDED_KEY  = "eq_seeded";
export const LS_THEME_PREFIX = "eq_theme_";
export const LS_LAST_ACTION  = "last_action_timestamp";