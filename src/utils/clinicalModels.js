// src/utils/clinicalModels.js
export const CLINICAL_MODELS = [

  // ── TCC ──────────────────────────────────────────────────────────────────

  {
    title: "Registro de Pensamentos Disfuncionais (RPD)",
    description: "Identifica e reestrutura pensamentos automáticos negativos. Exercício central da TCC.",
    category: "TCC",
    questions: [
      { id: "q1", type: "instruction", text: "📌 Preencha este registro logo após uma situação que gerou emoção intensa." },
      { id: "q2", type: "open",        text: "Descreva a situação: o que aconteceu, onde e quando?" },
      { id: "q3", type: "open",        text: "Qual foi o pensamento automático que surgiu? (ex: 'Eu vou fracassar')" },
      { id: "q4", type: "scale",       text: "O quanto você acreditou nesse pensamento? (0 = nada, 10 = totalmente)", minLabel: "Não acreditei", maxLabel: "Acreditei completamente" },
      { id: "q5", type: "open",        text: "Que emoção(ões) você sentiu? Qual a intensidade de cada uma?" },
      { id: "q6", type: "open",        text: "Quais evidências APOIAM esse pensamento?" },
      { id: "q7", type: "open",        text: "Quais evidências CONTRADIZEM esse pensamento?" },
      { id: "q8", type: "open",        text: "Qual seria um pensamento mais equilibrado e realista?" },
      { id: "q9", type: "scale",       text: "Após a reestruturação, o quanto você acredita no pensamento original agora?", minLabel: "Não acredito mais", maxLabel: "Continuo acreditando" },
    ],
  },

  {
    title: "Experimento Comportamental",
    description: "Testa na prática se um pensamento disfuncional é realmente verdadeiro.",
    category: "TCC",
    questions: [
      { id: "q1", type: "instruction", text: "🧪 Um experimento comportamental é uma 'missão' para testar seus pensamentos no mundo real." },
      { id: "q2", type: "open",        text: "Qual crença ou previsão você quer testar? (ex: 'Se eu falar em público, todos vão rir de mim')" },
      { id: "q3", type: "scale",       text: "O quanto você acredita nessa previsão agora? (0–10)", minLabel: "0 - Não acredito", maxLabel: "10 - Certeza total" },
      { id: "q4", type: "open",        text: "Qual experimento você vai fazer para testar isso? Descreva a situação concreta." },
      { id: "q5", type: "open",        text: "O que você prevê que vai acontecer?" },
      { id: "q6", type: "open",        text: "O que realmente aconteceu?" },
      { id: "q7", type: "open",        text: "O resultado confirma ou contradiz sua crença original? O que aprendeu?" },
      { id: "q8", type: "scale",       text: "Após o experimento, o quanto ainda acredita na previsão original?", minLabel: "0 - Não acredito mais", maxLabel: "10 - Confirmo" },
    ],
  },

  {
    title: "Ativação Comportamental",
    description: "Planejamento de atividades prazerosas e de domínio para combater a inércia depressiva.",
    category: "TCC",
    questions: [
      { id: "q1", type: "instruction", text: "🌱 A depressão nos afasta das atividades que nos dão prazer. Este exercício reverte esse ciclo." },
      { id: "q2", type: "open",        text: "Liste 3 atividades que você costumava gostar mas parou de fazer:" },
      { id: "q3", type: "open",        text: "Liste 3 atividades simples que ainda consegue fazer hoje (mesmo sem vontade):" },
      { id: "q4", type: "open",        text: "Escolha UMA atividade e descreva quando e como vai realizá-la esta semana:" },
      { id: "q5", type: "scale",       text: "Antes de fazer: qual a sua motivação agora? (0–10)", minLabel: "Nenhuma motivação", maxLabel: "Muita motivação" },
      { id: "q6", type: "open",        text: "Após realizar: como você se sentiu? O que notou?" },
      { id: "q7", type: "scale",       text: "Após fazer a atividade: qual foi seu humor? (0–10)", minLabel: "Muito baixo", maxLabel: "Muito bom" },
    ],
  },

  {
    title: "Reestruturação Cognitiva Escrita",
    description: "Exercício guiado para identificar distorções cognitivas e construir pensamentos alternativos.",
    category: "TCC",
    questions: [
      { id: "q1", type: "open",    text: "Descreva a situação que está te incomodando:" },
      { id: "q2", type: "open",    text: "Qual é o pensamento automático principal?" },
      { id: "q3", type: "open",    text: "Qual distorção cognitiva você identifica? (ex: catastrofização, leitura mental, generalização...)" },
      { id: "q4", type: "open",    text: "Se um amigo tivesse esse pensamento, o que você diria a ele?" },
      { id: "q5", type: "open",    text: "Reescreva o pensamento de forma mais realista e compassiva:" },
      { id: "q6", type: "reflect", text: "Como você se sente após reformular o pensamento? O que mudou?" },
    ],
  },

  {
    title: "Planejamento de Atividades Semanais",
    description: "Organiza a semana equilibrando obrigações, prazer e descanso.",
    category: "TCC",
    questions: [
      { id: "q1", type: "instruction", text: "📅 Planejar atividades com antecedência aumenta a sensação de controle e bem-estar." },
      { id: "q2", type: "open",        text: "Liste as obrigações desta semana que não podem ser evitadas:" },
      { id: "q3", type: "open",        text: "Liste pelo menos 2 atividades prazerosas que quer incluir na semana:" },
      { id: "q4", type: "open",        text: "Qual momento reservará para descanso ou autocuidado?" },
      { id: "q5", type: "open",        text: "Existe algo que costuma sabotar seu planejamento? Como pode prevenir isso?" },
      { id: "q6", type: "reflect",     text: "Ao final da semana: o que conseguiu cumprir? O que aprendeu sobre si mesmo?" },
    ],
  },

  // ── ACT ──────────────────────────────────────────────────────────────────

  {
    title: "Defusão Cognitiva",
    description: "Exercício de distanciamento dos pensamentos para reduzir seu impacto emocional.",
    category: "ACT",
    questions: [
      { id: "q1", type: "instruction", text: "💭 Defusão é aprender a observar pensamentos sem se fundir com eles." },
      { id: "q2", type: "open",        text: "Qual pensamento perturbador está mais presente para você hoje?" },
      { id: "q3", type: "instruction", text: "✏️ Agora adicione a frase 'Estou tendo o pensamento de que...' antes dele e escreva abaixo:" },
      { id: "q4", type: "open",        text: "Pensamento com prefixo de defusão: 'Estou tendo o pensamento de que...'" },
      { id: "q5", type: "reflect",     text: "O que você percebeu ao fazer isso? O pensamento perdeu um pouco de força?" },
      { id: "q6", type: "open",        text: "Se esse pensamento fosse um personagem, como seria? Dê um nome ou forma a ele:" },
      { id: "q7", type: "reflect",     text: "Com esse distanciamento, que ação alinhada aos seus valores você poderia tomar agora?" },
    ],
  },

  {
    title: "Clarificação de Valores",
    description: "Identifica o que realmente importa para guiar ações comprometidas.",
    category: "ACT",
    questions: [
      { id: "q1", type: "instruction", text: "🧭 Valores são direções de vida, não metas. Eles guiam suas ações independente das circunstâncias." },
      { id: "q2", type: "open",        text: "Nas áreas abaixo, escreva o que é mais importante para você:\n\n• Relacionamentos:\n• Trabalho/Estudos:\n• Saúde:\n• Crescimento pessoal:" },
      { id: "q3", type: "open",        text: "Escolha o valor mais importante agora. Como você está vivendo de acordo com ele?" },
      { id: "q4", type: "scale",       text: "De 0 a 10, o quanto suas ações atuais estão alinhadas a esse valor?", minLabel: "Nada alinhado", maxLabel: "Totalmente alinhado" },
      { id: "q5", type: "open",        text: "O que está te impedindo de viver mais de acordo com esse valor?" },
      { id: "q6", type: "open",        text: "Que pequena ação concreta você pode fazer esta semana em direção a esse valor?" },
    ],
  },

  {
    title: "Mindfulness — Observação do Momento Presente",
    description: "Prática de atenção plena para ancoragem no aqui e agora.",
    category: "ACT",
    questions: [
      { id: "q1", type: "instruction", text: "🧘 Reserve 5 minutos em um lugar tranquilo antes de responder." },
      { id: "q2", type: "open",        text: "Descreva 5 coisas que você pode VER agora:" },
      { id: "q3", type: "open",        text: "Descreva 4 coisas que você pode SENTIR fisicamente (toque, temperatura...):" },
      { id: "q4", type: "open",        text: "Descreva 3 coisas que você pode OUVIR:" },
      { id: "q5", type: "open",        text: "O que você notou na sua mente durante essa prática?" },
      { id: "q6", type: "scale",       text: "Antes da prática, qual era sua agitação mental? (0–10)", minLabel: "Tranquilo", maxLabel: "Muito agitado" },
      { id: "q7", type: "scale",       text: "Após a prática, qual é sua agitação mental agora?", minLabel: "Tranquilo", maxLabel: "Muito agitado" },
    ],
  },

  {
    title: "Ações Comprometidas",
    description: "Define ações concretas alinhadas aos valores mesmo na presença de dificuldades.",
    category: "ACT",
    questions: [
      { id: "q1", type: "open",    text: "Qual valor você quer honrar esta semana?" },
      { id: "q2", type: "open",    text: "Que obstáculos internos (pensamentos, emoções) podem aparecer?" },
      { id: "q3", type: "open",    text: "Que obstáculos externos podem aparecer?" },
      { id: "q4", type: "open",    text: "Mesmo com esses obstáculos, qual ação comprometida você vai tomar?" },
      { id: "q5", type: "open",    text: "Quando e como especificamente vai realizar essa ação?" },
      { id: "q6", type: "reflect", text: "Após a semana: você realizou a ação? O que a experiência te ensinou?" },
    ],
  },

  // ── DBT ──────────────────────────────────────────────────────────────────

  {
    title: "Regulação Emocional — PLEASE",
    description: "Habilidade DBT de cuidado físico para reduzir vulnerabilidade emocional.",
    category: "DBT",
    questions: [
      { id: "q1", type: "instruction", text: "💊 PLEASE: tratar doenças físicas, alimentação equilibrada, evitar substâncias, sono regulado, exercício." },
      { id: "q2", type: "scale",       text: "Esta semana, como estava seu SONO? (0–10)", minLabel: "Muito ruim", maxLabel: "Excelente" },
      { id: "q3", type: "scale",       text: "Como estava sua ALIMENTAÇÃO?", minLabel: "Muito ruim", maxLabel: "Excelente" },
      { id: "q4", type: "scale",       text: "Praticou algum EXERCÍCIO ou movimento físico?", minLabel: "Nenhum", maxLabel: "Muito" },
      { id: "q5", type: "open",        text: "Usou alguma substância (álcool, etc.) para lidar com emoções? Descreva:" },
      { id: "q6", type: "open",        text: "Qual área do PLEASE precisa mais atenção esta semana?" },
      { id: "q7", type: "open",        text: "Que ação concreta vai tomar para melhorar essa área?" },
    ],
  },

  {
    title: "Tolerância ao Estresse — TIPP",
    description: "Técnicas rápidas de regulação fisiológica para crises emocionais intensas.",
    category: "DBT",
    questions: [
      { id: "q1", type: "instruction", text: "🚨 TIPP é para momentos de crise: Temperatura, Exercício Intenso, Respiração Compassada, Relaxamento." },
      { id: "q2", type: "open",        text: "Descreva a situação de estresse ou crise que você enfrentou:" },
      { id: "q3", type: "scale",       text: "Intensidade emocional no pico da crise (0–10):", minLabel: "Baixa", maxLabel: "Insuportável" },
      { id: "q4", type: "open",        text: "Qual técnica TIPP você usou ou poderia usar? (ex: água gelada no rosto, corrida, respiração 4-7-8)" },
      { id: "q5", type: "scale",       text: "Intensidade emocional após usar a técnica:", minLabel: "Baixa", maxLabel: "Ainda intensa" },
      { id: "q6", type: "reflect",     text: "O que funcionou? O que faria diferente na próxima vez?" },
    ],
  },

  {
    title: "Efetividade Interpessoal — DEAR MAN",
    description: "Habilidade DBT para pedir o que precisa de forma assertiva e respeitosa.",
    category: "DBT",
    questions: [
      { id: "q1", type: "instruction", text: "💬 DEAR MAN: Descrever, Expressar, Afirmar, Reforçar, Manter foco, Aparentar confiança, Negociar." },
      { id: "q2", type: "open",        text: "O que você precisa pedir ou comunicar? Para quem?" },
      { id: "q3", type: "open",        text: "DESCREVER — Descreva os fatos objetivos da situação (sem julgamentos):" },
      { id: "q4", type: "open",        text: "EXPRESSAR — Como você se sente em relação a isso? (use 'eu me sinto...')" },
      { id: "q5", type: "open",        text: "AFIRMAR — O que você pede claramente? (seja específico)" },
      { id: "q6", type: "open",        text: "REFORÇAR — Qual o benefício para a outra pessoa se atender ao seu pedido?" },
      { id: "q7", type: "reflect",     text: "Como foi a conversa? O que funcionou na sua comunicação?" },
    ],
  },

  {
    title: "Mindfulness DBT — Mente Sábia",
    description: "Acessa o equilíbrio entre mente racional e mente emocional.",
    category: "DBT",
    questions: [
      { id: "q1", type: "instruction", text: "⚖️ Mente Sábia é o ponto de equilíbrio entre razão e emoção. Todos temos acesso a ela." },
      { id: "q2", type: "open",        text: "Descreva uma decisão ou situação difícil que está enfrentando:" },
      { id: "q3", type: "open",        text: "O que sua MENTE RACIONAL diz sobre isso? (lógica, fatos, consequências)" },
      { id: "q4", type: "open",        text: "O que sua MENTE EMOCIONAL diz? (sentimentos, impulsos, medos)" },
      { id: "q5", type: "reflect",     text: "Se você pausasse e respirasse fundo, o que sua MENTE SÁBIA — integrando os dois lados — diria?" },
      { id: "q6", type: "open",        text: "Que ação sábia você pode tomar a partir disso?" },
    ],
  },

  // ── BA ────────────────────────────────────────────────────────────────────

  {
    title: "Monitoramento de Atividades e Humor",
    description: "Rastreia a relação entre atividades diárias e estado emocional.",
    category: "BA",
    questions: [
      { id: "q1", type: "instruction", text: "📊 Registre as principais atividades de hoje e como cada uma afetou seu humor." },
      { id: "q2", type: "open",        text: "Manhã: que atividades você fez? Descreva brevemente:" },
      { id: "q3", type: "scale",       text: "Humor durante a manhã (0–10):", minLabel: "Muito baixo", maxLabel: "Excelente" },
      { id: "q4", type: "open",        text: "Tarde: que atividades você fez?" },
      { id: "q5", type: "scale",       text: "Humor durante a tarde (0–10):", minLabel: "Muito baixo", maxLabel: "Excelente" },
      { id: "q6", type: "open",        text: "Noite: que atividades você fez?" },
      { id: "q7", type: "scale",       text: "Humor durante a noite (0–10):", minLabel: "Muito baixo", maxLabel: "Excelente" },
      { id: "q8", type: "reflect",     text: "Que padrão você percebe? Quais atividades elevam seu humor? Quais rebaixam?" },
    ],
  },

  {
    title: "Quebra de Esquiva Comportamental",
    description: "Identifica comportamentos de evitação e planeja enfrentamento gradual.",
    category: "BA",
    questions: [
      { id: "q1", type: "instruction", text: "🚧 Esquiva é quando evitamos situações para reduzir ansiedade, mas isso piora o humor no longo prazo." },
      { id: "q2", type: "open",        text: "Que situação, atividade ou pessoa você tem evitado?" },
      { id: "q3", type: "open",        text: "O que você acredita que vai acontecer de ruim se não evitar?" },
      { id: "q4", type: "open",        text: "Qual é o custo dessa evitação para sua vida?" },
      { id: "q5", type: "open",        text: "Descreva um primeiro passo pequeno e seguro para se aproximar dessa situação:" },
      { id: "q6", type: "open",        text: "Quando e como vai dar esse primeiro passo?" },
      { id: "q7", type: "reflect",     text: "Após tentar: o que aconteceu? Sua previsão se confirmou?" },
    ],
  },

  // ── THS ──────────────────────────────────────────────────────────────────

  {
    title: "Ensaio Comportamental — Role-Play",
    description: "Pratica habilidades sociais em situações desafiadoras antes de enfrentá-las.",
    category: "THS",
    questions: [
      { id: "q1", type: "instruction", text: "🎭 Imagine a situação social como se fosse um ensaio de teatro. Quanto mais você pratica, mais natural fica." },
      { id: "q2", type: "open",        text: "Qual situação social te causa dificuldade ou ansiedade?" },
      { id: "q3", type: "open",        text: "O que especificamente é difícil? (iniciar conversa, discordar, pedir algo, recusar...)" },
      { id: "q4", type: "open",        text: "Como você costuma reagir nessa situação atualmente?" },
      { id: "q5", type: "open",        text: "Como uma pessoa confiante e assertiva reagiria? Escreva o que diria e faria:" },
      { id: "q6", type: "open",        text: "Pratique em voz alta ou na frente do espelho. O que percebeu?" },
      { id: "q7", type: "reflect",     text: "Após enfrentar a situação real: o que funcionou? O que melhoraria?" },
    ],
  },

  {
    title: "Comunicação Assertiva",
    description: "Desenvolve habilidade de expressar necessidades com clareza e respeito.",
    category: "THS",
    questions: [
      { id: "q1", type: "instruction", text: "🗣️ Assertividade é diferente de agressividade (impor) e passividade (ceder sempre). É o meio-termo saudável." },
      { id: "q2", type: "open",        text: "Em que situações você tem dificuldade de se expressar assertivamente?" },
      { id: "q3", type: "open",        text: "Você tende mais para a passividade ou para a agressividade nessas situações? Por quê?" },
      { id: "q4", type: "open",        text: "Escreva o que gostaria de dizer em uma situação recente usando a fórmula:\n'Quando você _____, eu me sinto _____. Gostaria que _____.'"},
      { id: "q5", type: "scale",       text: "O quanto essa mensagem expressa o que você realmente quer comunicar? (0–10)", minLabel: "Nada", maxLabel: "Perfeitamente" },
      { id: "q6", type: "reflect",     text: "O que te impede de falar assim na vida real? Como você poderia superar isso?" },
    ],
  },

  {
    title: "Registro de Interações Sociais",
    description: "Monitora e avalia situações sociais para identificar padrões e progressos.",
    category: "THS",
    questions: [
      { id: "q1", type: "open",    text: "Descreva uma interação social que aconteceu esta semana:" },
      { id: "q2", type: "open",    text: "O que você fez bem nessa interação?" },
      { id: "q3", type: "open",    text: "O que poderia ter feito de diferente?" },
      { id: "q4", type: "scale",   text: "Satisfação geral com essa interação (0–10):", minLabel: "Insatisfeito", maxLabel: "Muito satisfeito" },
      { id: "q5", type: "open",    text: "Que habilidade social quer praticar na próxima semana?" },
    ],
  },

  // ── Psicologia Positiva ──────────────────────────────────────────────────

  {
    title: "Diário de Gratidão",
    description: "Treina o foco em aspectos positivos da vida para aumentar bem-estar.",
    category: "Psicologia Positiva",
    questions: [
      { id: "q1", type: "instruction", text: "🌟 Pesquisas mostram que 3 semanas de prática de gratidão aumentam significativamente o bem-estar." },
      { id: "q2", type: "open",        text: "Liste 3 coisas boas que aconteceram hoje (podem ser pequenas):\n1.\n2.\n3." },
      { id: "q3", type: "open",        text: "Escolha uma delas e descreva com mais detalhes. Por que ela foi boa?" },
      { id: "q4", type: "open",        text: "Que papel você teve para que isso acontecesse?" },
      { id: "q5", type: "scale",       text: "Como está seu humor agora, após esse exercício? (0–10)", minLabel: "Muito baixo", maxLabel: "Muito bom" },
    ],
  },

  {
    title: "Identificação de Forças Pessoais",
    description: "Reconhece e amplifica forças de caráter para aumentar florescimento.",
    category: "Psicologia Positiva",
    questions: [
      { id: "q1", type: "instruction", text: "💪 Forças de caráter são qualidades autênticas suas. Usá-las gera fluxo e bem-estar." },
      { id: "q2", type: "open",        text: "Liste 5 qualidades ou forças que você reconhece em si mesmo:" },
      { id: "q3", type: "open",        text: "Escolha a força que mais te representa. Dê um exemplo de quando você a usou:" },
      { id: "q4", type: "open",        text: "Como você poderia usar essa força de uma forma nova esta semana?" },
      { id: "q5", type: "reflect",     text: "O que você sente quando age a partir dessa força? Como isso afeta as pessoas ao seu redor?" },
    ],
  },

  {
    title: "Carta de Autocompaixão",
    description: "Desenvolve uma relação mais gentil consigo mesmo em momentos de dificuldade.",
    category: "Psicologia Positiva",
    questions: [
      { id: "q1", type: "instruction", text: "💌 Imagine que um amigo querido está passando pelo que você está passando. O que você diria a ele?" },
      { id: "q2", type: "open",        text: "Descreva a situação difícil ou falha pela qual você está se julgando:" },
      { id: "q3", type: "open",        text: "Que palavras duras você diz a si mesmo sobre isso?" },
      { id: "q4", type: "open",        text: "Agora escreva uma carta para si mesmo com a mesma gentileza que teria com um amigo querido:" },
      { id: "q5", type: "reflect",     text: "Como você se sentiu ao escrever essa carta? O que foi difícil? O que foi aliviante?" },
      { id: "q6", type: "open",        text: "Que frase de autocompaixão você pode repetir quando se sentir assim novamente?" },
    ],
  },

  // ── ✨ Modelos Dinâmicos Equilibre ────────────────────────────────────────
  // Usam slider_emoji e breathing para experiência mais interativa

  {
    title: "Respiração 4-7-8",
    description: "Técnica de respiração guiada para reduzir a ansiedade rapidamente com anel animado.",
    category: "TCC",
    questions: [
      { id: "q1", type: "slider_emoji", text: "Antes de começar: como você está se sentindo agora?" },
      { id: "q2", type: "breathing",    text: "🌬️ Siga o ritmo abaixo. Inspire pelo nariz, segure e expire devagar.", cycles: 3 },
      { id: "q3", type: "scale",        text: "De 0 a 10, qual é o seu nível de ansiedade APÓS o exercício?", minLabel: "Sem ansiedade", maxLabel: "Ansiedade intensa" },
      { id: "q4", type: "open",         text: "O que você percebeu no seu corpo durante a respiração?" },
    ],
  },

  {
    title: "Check-in Emocional Diário",
    description: "Registro rápido do estado emocional com slider interativo para rastrear bem-estar.",
    category: "Psicologia Positiva",
    questions: [
      { id: "q1", type: "slider_emoji", text: "Como você está se sentindo agora?" },
      { id: "q2", type: "open",         text: "O que está influenciando esse sentimento hoje?" },
      { id: "q3", type: "open",         text: "Que necessidade sua não está sendo atendida no momento?" },
      { id: "q4", type: "open",         text: "Que pequena ação poderia melhorar como você está se sentindo agora?" },
      { id: "q5", type: "slider_emoji", text: "Após refletir: como você está se sentindo agora?" },
    ],
  },

  {
    title: "Escaneamento Corporal com Respiração",
    description: "Mindfulness guiado com atenção ao corpo e respiração animada para encerrar.",
    category: "ACT",
    questions: [
      { id: "q1", type: "slider_emoji", text: "Como está sua energia agora?" },
      { id: "q2", type: "instruction",  text: "🧘 Deite-se ou sente-se confortavelmente. Feche os olhos. Perceba seus pés → pernas → quadril → abdômen → peito → ombros → cabeça. Leve 3 minutos nesse percurso." },
      { id: "q3", type: "open",         text: "Em quais partes do corpo você sentiu mais tensão ou desconforto?" },
      { id: "q4", type: "open",         text: "Em quais partes você sentiu leveza ou relaxamento?" },
      { id: "q5", type: "scale",        text: "Qualidade de presença durante o exercício (0 = muito distraído, 10 = totalmente presente):", minLabel: "Muito distraído", maxLabel: "Totalmente presente" },
      { id: "q6", type: "breathing",    text: "🌬️ Para encerrar, faça 2 ciclos de respiração consciente.", cycles: 2 },
    ],
  },

  {
    title: "Gratidão com Check-in Emocional",
    description: "Combina prática de gratidão com slider emocional para medir impacto no humor.",
    category: "Psicologia Positiva",
    questions: [
      { id: "q1", type: "slider_emoji", text: "Como você está se sentindo antes de começar?" },
      { id: "q2", type: "open",         text: "Liste 3 coisas pelas quais você é grato(a) hoje (podem ser pequenas):" },
      { id: "q3", type: "open",         text: "Qual dessas coisas te tocou mais profundamente? Por quê?" },
      { id: "q4", type: "reflect",      text: "Feche os olhos por 30 segundos e sinta essa gratidão no seu corpo. Onde você a percebe fisicamente?" },
      { id: "q5", type: "slider_emoji", text: "E agora, como você está se sentindo?" },
    ],
  },
];
