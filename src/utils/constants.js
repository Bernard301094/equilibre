// ─── Application ─────────────────────────────────────────────────────────────────────────────────
export const APP_NAME  = "Equilibre";
export const LOGO_PATH = "/equilibre-icon.png";

// ─── Roles ───────────────────────────────────────────────────────────────────────────────────
export const ROLE = /** @type {const} */ ({ THERAPIST: "therapist", PATIENT: "patient" });

// ─── Exercise categories ────────────────────────────────────────────────────────────
export const CATEGORIES = ["Ansiedade","Bem-estar","Mindfulness","Autoconhecimento","Relacionamentos","Outro"];

export const CATEGORY_CLASS = {
  Mindfulness: "mindfulness", "Bem-estar": "bem-estar", Ansiedade: "ansiedade",
  Autoconhecimento: "autoconhecimento", Relacionamentos: "relacionamentos", Outro: "outro",
};

// ─── Question types ───────────────────────────────────────────────────────────────
export const QUESTION_TYPES = [
  // ─ Básicos
  { value: "open",            label: "Resposta aberta",       group: "basico" },
  { value: "scale",           label: "Escala (0–10)",          group: "basico" },
  { value: "reflect",         label: "Reflexão (opcional)",   group: "basico" },
  { value: "instruction",     label: "Instrução",             group: "basico" },
  { value: "yes_no",          label: "Sim / Não",             group: "basico" },
  { value: "multiple_choice", label: "Múltipla escolha",      group: "basico" },
  { value: "checklist",       label: "Checklist",              group: "basico" },
  { value: "number",          label: "Número livre",           group: "basico" },
  { value: "time",            label: "Horário",               group: "basico" },
  // ─ Clínicos
  { value: "emotion_wheel",      label: "Roda das emoções",     group: "clinico" },
  { value: "thought_record",     label: "Registro de pensamento", group: "clinico" },
  { value: "body_map",           label: "Mapa corporal",          group: "clinico" },
  { value: "suds",               label: "Nível de sofrimento (SUDS)", group: "clinico" },
  { value: "mood_grid",          label: "Grade de humor",         group: "clinico" },
  { value: "gratitude_list",     label: "Lista de gratidão",      group: "clinico" },
  // ─ Interativos
  { value: "slider_emoji",    label: "Slider emocional",     group: "interativo" },
  { value: "breathing",       label: "Respiração animada",   group: "interativo" },
];

// ─── Emotion wheel data ──────────────────────────────────────────────────────────────
export const EMOTION_WHEEL = [
  { id: "alegria",       label: "Alegria",       emoji: "😄", color: "#f6e05e", parent: null },
  { id: "gratidao",      label: "Gratidão",      emoji: "😊", color: "#faf089", parent: "alegria" },
  { id: "esperanca",     label: "Esperança",     emoji: "🌱", color: "#c6f6d5", parent: "alegria" },
  { id: "entusiasmo",    label: "Entusiasmo",    emoji: "🚀", color: "#fbd38d", parent: "alegria" },
  { id: "calma",         label: "Calma",         emoji: "🧘", color: "#bee3f8", parent: "alegria" },
  { id: "tristeza",      label: "Tristeza",      emoji: "😢", color: "#bee3f8", parent: null },
  { id: "solidao",       label: "Solidão",       emoji: "🚫", color: "#90cdf4", parent: "tristeza" },
  { id: "desanimo",      label: "Desânimo",      emoji: "😞", color: "#a0aec0", parent: "tristeza" },
  { id: "saudade",       label: "Saudade",       emoji: "😔", color: "#c3dafe", parent: "tristeza" },
  { id: "dor",           label: "Dor",           emoji: "💔", color: "#feb2b2", parent: "tristeza" },
  { id: "medo",          label: "Medo",          emoji: "😨", color: "#fbd38d", parent: null },
  { id: "ansiedade",     label: "Ansiedade",     emoji: "😰", color: "#fef3c7", parent: "medo" },
  { id: "inseguranca",   label: "Insegurança",   emoji: "🤔", color: "#fde68a", parent: "medo" },
  { id: "panico",        label: "Pânico",        emoji: "😱", color: "#fed7aa", parent: "medo" },
  { id: "raiva",         label: "Raiva",         emoji: "😡", color: "#fc8181", parent: null },
  { id: "frustracao",    label: "Frustração",    emoji: "😤", color: "#feb2b2", parent: "raiva" },
  { id: "irritacao",     label: "Irritação",     emoji: "😠", color: "#fc8181", parent: "raiva" },
  { id: "ciume",         label: "Ciúmes",        emoji: "😑", color: "#fbd38d", parent: "raiva" },
  { id: "nojo",          label: "Nojo",          emoji: "🤢", color: "#9ae6b4", parent: "raiva" },
  { id: "vergonha",      label: "Vergonha",      emoji: "😳", color: "#fed7e2", parent: null },
  { id: "culpa",         label: "Culpa",         emoji: "😔", color: "#e9d8fd", parent: "vergonha" },
  { id: "constrangimento",label: "Constrangimento",emoji:"😳",color: "#fed7e2", parent: "vergonha" },
  { id: "inferioridade", label: "Inferioridade", emoji: "😔", color: "#c3dafe", parent: "vergonha" },
  { id: "surpresa",      label: "Surpresa",      emoji: "😯", color: "#e9d8fd", parent: null },
  { id: "confusao",      label: "Confusão",      emoji: "🤔", color: "#fef3c7", parent: "surpresa" },
  { id: "admiracao",     label: "Admiração",     emoji: "🤩", color: "#faf089", parent: "surpresa" },
];

// ─── Body map regions ───────────────────────────────────────────────────────────────
export const BODY_REGIONS = [
  { id: "cabeca",   label: "Cabeça",       x: 50, y: 8  },
  { id: "pescoco",  label: "Pescoço",      x: 50, y: 17 },
  { id: "ombro_e",  label: "Ombro esq.",   x: 30, y: 22 },
  { id: "ombro_d",  label: "Ombro dir.",   x: 70, y: 22 },
  { id: "peito",    label: "Peito",        x: 50, y: 28 },
  { id: "abdomen",  label: "Abdômen",      x: 50, y: 40 },
  { id: "braco_e",  label: "Braço esq.",   x: 22, y: 35 },
  { id: "braco_d",  label: "Braço dir.",   x: 78, y: 35 },
  { id: "mao_e",    label: "Mão esq.",     x: 15, y: 50 },
  { id: "mao_d",    label: "Mão dir.",     x: 85, y: 50 },
  { id: "quadril",  label: "Quadril",      x: 50, y: 52 },
  { id: "coxa_e",   label: "Coxa esq.",    x: 38, y: 63 },
  { id: "coxa_d",   label: "Coxa dir.",    x: 62, y: 63 },
  { id: "joelho_e", label: "Joelho esq.",  x: 36, y: 74 },
  { id: "joelho_d", label: "Joelho dir.",  x: 64, y: 74 },
  { id: "pe_e",     label: "Pé esq.",      x: 36, y: 90 },
  { id: "pe_d",     label: "Pé dir.",      x: 64, y: 90 },
];

// ─── Diary moods — FONTE ÚNICA DA VERDADE ─────────────────────────────────────────────
export const MOOD_OPTIONS = [
  { id: "muito-dificil", val: 1, emoji: "😔", label: "Muito difícil",  color: "#e53e3e" },
  { id: "esgotado",      val: 2, emoji: "😞", label: "Esgotado",       color: "#dd6b20" },
  { id: "frustrado",     val: 2, emoji: "😤", label: "Frustrado",      color: "#d69e2e" },
  { id: "ansioso",       val: 3, emoji: "😰", label: "Ansioso",        color: "#b7791f" },
  { id: "sem-sentir",    val: 3, emoji: "😶", label: "Sem sentir",     color: "#718096" },
  { id: "neutro",        val: 3, emoji: "😐", label: "Neutro",         color: "#4a5568" },
  { id: "tranquilo",     val: 4, emoji: "🙂", label: "Tranquilo",      color: "#2f855a" },
  { id: "esperancoso",   val: 4, emoji: "🌱", label: "Esperançoso",    color: "#276749" },
  { id: "bem",           val: 5, emoji: "😊", label: "Bem",            color: "#2b6cb0" },
  { id: "muito-bem",     val: 5, emoji: "😄", label: "Muito bem",      color: "#2c5282" },
];

export function resolveMood(moodId, moodVal) {
  if (moodId) { const byId = MOOD_OPTIONS.find((m) => m.id === moodId); if (byId) return byId; }
  return MOOD_OPTIONS.find((m) => m.val === moodVal) ?? MOOD_OPTIONS[4];
}
/** @deprecated Use MOOD_OPTIONS */
export const MOODS = MOOD_OPTIONS;

// ─── Behavioral Activation ──────────────────────────────────────────────────────────────
export const BA_PILLARS = [
  { name: "Autocuidado",       icon: "🧘", desc: "Cuidar de si" },
  { name: "Responsabilidades", icon: "📋", desc: "Deveres diários" },
  { name: "Lazer",             icon: "🎨", desc: "Diversão e hobbies" },
  { name: "Movimento",         icon: "🏃", desc: "Corpo ativo" },
  { name: "Socialização",      icon: "🗣️", desc: "Conexão com outros" },
];
export const BA_CATEGORIES      = BA_PILLARS.map((p) => p.name);
export const BA_DIFFICULTIES    = ["Muito fácil", "Fácil", "Moderado", "Desafiador"];
export const BA_AVOIDANCE_REASONS = ["Falta de energia","Esqueci","Falta de tempo","Evitei / Ansiedade","Outro imprevisto"];

// ─── Plant gamification ───────────────────────────────────────────────────────────────
export const PLANT_STAGES = [
  { minStreak: 0,  icon: "🌰", label: "Semente",        color: "#8b5a2b", desc: "Pronta para crescer." },
  { minStreak: 1,  icon: "🌱", label: "Brotinho",       color: "#a8d5ba", desc: "Começando a brotar." },
  { minStreak: 3,  icon: "🌿", label: "Planta Jovem",   color: "#7abd8c", desc: "Ganhando folhas." },
  { minStreak: 6,  icon: "🪴", label: "Planta no Vaso", color: "#4a9c5d", desc: "Crescendo forte." },
  { minStreak: 10, icon: "🌳", label: "Árvore Firme",   color: "#2d7a3a", desc: "Raízes profundas." },
  { minStreak: 15, icon: "🌸", label: "Árvore Florida", color: "#e88fb4", desc: "Seu jardim está lindo!" },
];
export function getPlantStage(streak) {
  let stage = PLANT_STAGES[0];
  for (const s of PLANT_STAGES) { if (streak >= s.minStreak) stage = s; }
  return stage;
}

// ─── Diary risk words ───────────────────────────────────────────────────────────────
export const DIARY_RISK_WORDS = ["triste","desespero","pânico","morte","ansiedade forte","chorar","não aguento","suicídio","angústia","crise"];

// ─── Seed exercises ───────────────────────────────────────────────────────────────────
export const SEED_EXERCISES = [
  {
    id: "ex1", title: "Respiração 4-7-8", category: "Ansiedade",
    description: "Técnica de respiração para reduzir a ansiedade rapidamente.",
    questions: [
      { id: "q1", type: "slider_emoji", text: "Antes de começar: como você está se sentindo agora?" },
      { id: "q2", type: "breathing", text: "🌬️ Siga o ritmo abaixo. Inspire pelo nariz, segure e expire devagar.", cycles: 3 },
      { id: "q3", type: "scale",  text: "De 0 a 10, qual é o seu nível de ansiedade APÓS o exercício?" },
      { id: "q4", type: "open",   text: "O que você percebeu no seu corpo durante a respiração?" },
    ],
  },
  {
    id: "ex2", title: "Registro de Pensamentos", category: "Ansiedade",
    description: "Identificar e questionar pensamentos automáticos negativos.",
    questions: [
      { id: "q1", type: "slider_emoji",  text: "Como você está se sentindo agora?" },
      { id: "q2", type: "thought_record", text: "Descreva o pensamento automático que surgiu." },
      { id: "q3", type: "scale",          text: "Qual a intensidade desse sentimento de 0 a 10?" },
      { id: "q4", type: "open",           text: "Que evidências contradizem esse pensamento?" },
      { id: "q5", type: "open",           text: "Como você poderia pensar de forma mais equilibrada?" },
    ],
  },
  {
    id: "ex3", title: "Gratidão Diária", category: "Bem-estar",
    description: "Prática de foco no positivo para fortalecer o bem-estar emocional.",
    questions: [
      { id: "q1", type: "slider_emoji",  text: "Como você está se sentindo antes de começar?" },
      { id: "q2", type: "gratitude_list", text: "Liste 3 coisas pelas quais você é grato(a) hoje." },
      { id: "q3", type: "open",           text: "Qual dessas coisas te tocou mais profundamente? Por quê?" },
      { id: "q4", type: "reflect",        text: "Feche os olhos por 30 segundos e sinta essa gratidão no seu corpo." },
      { id: "q5", type: "slider_emoji",  text: "E agora, como você está se sentindo?" },
    ],
  },
  {
    id: "ex4", title: "Escaneamento Corporal", category: "Mindfulness",
    description: "Atenção plena ao corpo para reduzir tensão e aumentar presença.",
    questions: [
      { id: "q1", type: "emotion_wheel", text: "Como você está se sentindo agora? Escolha a emoção mais próxima." },
      { id: "q2", type: "body_map",      text: "Onde no corpo você sente tensão ou desconforto? Toque nas regiões." },
      { id: "q3", type: "instruction",  text: "🧘 Deite-se ou sente-se. Feche os olhos. Percorra seu corpo dos pés à cabeça por 3 minutos." },
      { id: "q4", type: "open",         text: "O que você percebeu durante o escaneamento?" },
      { id: "q5", type: "suds",         text: "Qual é o seu nível de desconforto agora? (SUDS 0–100)" },
      { id: "q6", type: "breathing",    text: "🌬️ Para encerrar, faça 2 ciclos de respiração consciente.", cycles: 2 },
    ],
  },
];

// ─── Token / LocalStorage ───────────────────────────────────────────────────────────────
export const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000;
export const LS_SESSION_KEY  = "equilibre_session";
export const LS_SEEDED_KEY   = "eq_seeded";
export const LS_THEME_PREFIX = "eq_theme_";
export const LS_LAST_ACTION  = "last_action_timestamp";
