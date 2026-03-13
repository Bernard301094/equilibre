# 🌿 Equilibre

**Equilibre** é uma plataforma web de acompanhamento psicológico que conecta terapeutas e pacientes de forma segura, intuitiva e acessível. Desenvolvida com foco em saúde mental, permite ao terapeuta monitorar o progresso dos seus pacientes e ao paciente realizar exercícios terapêuticos, registrar o diário emocional e acompanhar sua evolução.

---

## ✨ Funcionalidades

### 👩‍⚕️ Terapeuta
- Dashboard com visão geral dos pacientes e atividades recentes
- Gestão de pacientes — vinculação por código de convite
- Criação de exercícios terapêuticos personalizados (escalas, perguntas abertas, instruções)
- Atribuição de exercícios a pacientes com data limite
- Visualização das respostas e progresso de cada paciente
- Prontuário clínico privado por paciente
- Mural de orientações (mensagens diretas ao paciente)
- Acompanhamento de bem-estar (humor, energia, ansiedade, motivação)
- Gestão de rotina comportamental (Behavioral Activation)
- Notificações em tempo real

### 🧑‍💻 Paciente
- Tela inicial com resumo do progresso semanal
- Lista de exercícios pendentes e concluídos
- Player de exercícios com suporte a escalas, texto livre e instruções
- Diário emocional com registro diário de humor
- Rotina semanal de atividades
- Histórico completo de exercícios realizados com feedback do terapeuta
- Gráficos de progresso (escalas e humor)
- Orientações recebidas do terapeuta
- Notificações de novas tarefas

### 🔐 Admin
- Dashboard administrativo com controlo de terapeutas
- Aprovação/rejeição de contas de terapeutas (verificação de CRP)
- Visão geral da plataforma

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Estilização | CSS Modules (sem framework) |
| Backend / DB | Supabase (PostgreSQL + Auth + REST) |
| Autenticação | JWT com refresh token |
| Deploy | Vercel |
| Controlo de versão | Git + GitHub |

---

## 🏗️ Arquitetura

```
src/
├── components/
│   ├── auth/          # Login e registo
│   ├── layout/        # TherapistLayout, PatientLayout, Sidebar, BottomNav
│   ├── shared/        # ProfileModal, MessagesView, AvatarDisplay
│   └── ui/            # Spinner, Toast, EmptyState, Skeleton...
├── features/
│   ├── admin/         # AdminDashboard
│   ├── therapist/     # Dashboard, PatientsView, ExercisesView, PatientModal...
│   └── patient/       # Home, PatientExercises, ExercisePage, DiaryView...
├── hooks/             # useSession, useTheme, useIsMobile
├── services/          # db.js, auth.js (Supabase REST direto)
└── utils/             # constants, dates, parsing, toast
```

---

## 🔒 Segurança

- **Row Level Security (RLS)** ativa em todas as tabelas
- Cada utilizador acede apenas aos seus próprios dados
- Terapeutas não acedem a dados de colegas
- Pacientes não acedem a dados de outros pacientes
- Autenticação por JWT com expiração e refresh automático
- Senhas armazenadas com **bcrypt** pelo Supabase Auth
- Conformidade em desenvolvimento com a **LGPD** (Lei Geral de Proteção de Dados)

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Bernard301094/equilibre.git
cd equilibre

# Instala as dependências
npm install

# Cria o arquivo de variáveis de ambiente
cp .env.example .env
```

### Variáveis de ambiente

Cria um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### Rodando

```bash
npm run dev
```

Acesse em: `http://localhost:5173`

---

## 📱 Progressive Web App (PWA)

O Equilibre é desenvolvido como PWA, sendo instalável em dispositivos móveis diretamente pelo browser. Para publicação na **Play Store**, está prevista integração via **Trusted Web Activity (TWA)**.

---

## 📋 Roadmap

- [x] Autenticação de terapeutas e pacientes
- [x] Sistema de convites por código
- [x] Criação e atribuição de exercícios
- [x] Diário emocional
- [x] Prontuário clínico
- [x] Gráficos de progresso
- [x] Mural de orientações
- [x] Row Level Security completa
- [ ] Notificações push (mobile)
- [ ] Videoconferência integrada
- [ ] Exportação de relatórios PDF
- [ ] Publicação na Play Store via TWA
- [ ] Multi-idioma (PT / ES / EN)

---

## 👨‍💻 Autor

Desenvolvido por **Bernard De Freitas**  
🔗 [github.com/Bernard301094](https://github.com/Bernard301094)

---

## 📄 Licença

Este projeto é de uso privado. Todos os direitos reservados © 2025 Bernard De Freitas.
