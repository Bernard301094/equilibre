<p align="center">
  <img src="public/logo.svg" alt="Equilibre Logo" width="80" />
</p>

<h1 align="center">Equilibre</h1>

<p align="center">
  Plataforma web de acompanhamento psicológico que conecta terapeutas e pacientes de forma segura, intuitiva e acessível.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/License-Private-red?style=flat-square" />
</p>

---

## Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Segurança](#segurança)
- [Como Rodar Localmente](#como-rodar-localmente)
- [PWA & Mobile](#pwa--mobile)
- [Roadmap](#roadmap)
- [Autor](#autor)

---

## Sobre o Projeto

**Equilibre** é uma plataforma web focada em saúde mental que facilita o acompanhamento terapêutico entre profissionais e seus pacientes. O terapeuta pode monitorar o progresso, criar exercícios personalizados e registrar prontuários clínicos; o paciente realiza os exercícios, mantém um diário emocional e acompanha sua evolução através de gráficos.

---

## Funcionalidades

### 👩‍⚕️ Terapeuta
- Dashboard com visão geral de pacientes e atividades recentes
- Vinculação de pacientes por **código de convite**
- Criação de exercícios terapêuticos personalizados (escalas, perguntas abertas, instruções)
- Atribuição de exercícios com data limite
- Visualização de respostas e progresso individual
- **Prontuário clínico** privado por paciente
- Mural de orientações (mensagens diretas ao paciente)
- Acompanhamento de bem-estar: humor, energia, ansiedade e motivação
- Gestão de rotina comportamental (*Behavioral Activation*)
- Notificações em tempo real

### 🧑‍💻 Paciente
- Tela inicial com resumo do progresso semanal
- Lista de exercícios pendentes e concluídos
- Player de exercícios com suporte a escalas, texto livre e instruções
- **Diário emocional** com registro diário de humor
- Rotina semanal de atividades
- Histórico de exercícios com feedback do terapeuta
- Gráficos de progresso (escalas e humor)
- Notificações de novas tarefas

### 🔐 Admin
- Dashboard administrativo com controle de terapeutas
- Aprovação/rejeição de contas com **verificação de CRP**
- Visão geral da plataforma

---

## Stack Tecnológica

| Camada           | Tecnologia                              |
|------------------|-----------------------------------------|
| Frontend         | React 19 + Vite 7                       |
| Roteamento       | React Router DOM 7                      |
| Estilização      | CSS Modules (sem framework externo)     |
| Backend / DB     | Supabase (PostgreSQL + Auth + REST)     |
| Autenticação     | JWT com refresh token automático        |
| Geração de PDF   | jsPDF + html2canvas                     |
| Deploy           | Vercel                                  |
| Controle de versão | Git + GitHub                          |

---

## Arquitetura

```
equilibre/
├── public/                   # Assets estáticos e manifesto PWA
└── src/
    ├── components/
    │   ├── auth/             # Login, registro e fluxos de autenticação
    │   ├── layout/           # TherapistLayout, PatientLayout, Sidebar, BottomNav
    │   ├── shared/           # ProfileModal, MessagesView, AvatarDisplay
    │   └── ui/               # Spinner, Toast, EmptyState, Skeleton...
    ├── features/
    │   ├── admin/            # AdminDashboard
    │   ├── therapist/        # Dashboard, PatientsView, ExercisesView, PatientModal...
    │   └── patient/          # Home, PatientExercises, ExercisePage, DiaryView...
    ├── hooks/                # useSession, useTheme, useIsMobile
    ├── services/             # db.js, auth.js — integração Supabase REST
    ├── utils/                # constants, dates, parsing, toast helpers
    ├── App.jsx
    └── main.jsx
```

A estrutura segue uma arquitetura **feature-based**, separando a lógica de negócio por domínio (`admin`, `therapist`, `patient`) e mantendo componentes de UI reutilizáveis na camada `components/ui`.

---

## Segurança

- **Row Level Security (RLS)** ativa em todas as tabelas do Supabase
- Cada utilizador acessa **exclusivamente os seus próprios dados**
- Terapeutas não têm acesso a dados de colegas; pacientes não têm acesso a dados de outros pacientes
- Autenticação via **JWT** com expiração e refresh automático
- Senhas armazenadas com **bcrypt** (gerenciado pelo Supabase Auth)
- Projeto desenvolvido em conformidade com a **LGPD** (Lei Geral de Proteção de Dados — Brasil)

---

## Como Rodar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- Conta no [Supabase](https://supabase.com)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/Bernard301094/equilibre.git
cd equilibre

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
```

### Variáveis de Ambiente

Edite o arquivo `.env` criado na raiz com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> ⚠️ Nunca faça commit do arquivo `.env`. Ele já está incluído no `.gitignore`.

### Scripts Disponíveis

| Comando           | Descrição                          |
|-------------------|------------------------------------|
| `npm run dev`     | Inicia o servidor de desenvolvimento (`http://localhost:5173`) |
| `npm run build`   | Gera o build de produção em `/dist` |
| `npm run preview` | Visualiza o build de produção localmente |
| `npm run lint`    | Executa o ESLint no projeto        |

---

## PWA & Mobile

O Equilibre é desenvolvido como **Progressive Web App (PWA)**, sendo instalável em dispositivos móveis diretamente pelo browser, sem necessidade de loja de aplicativos. Para publicação futura na **Play Store**, está prevista integração via **Trusted Web Activity (TWA)**.

---

## Roadmap

| Status | Funcionalidade |
|--------|---------------|
| ✅ | Autenticação de terapeutas e pacientes |
| ✅ | Sistema de convites por código |
| ✅ | Criação e atribuição de exercícios |
| ✅ | Diário emocional |
| ✅ | Prontuário clínico |
| ✅ | Gráficos de progresso |
| ✅ | Mural de orientações |
| ✅ | Row Level Security completa |
| 🔜 | Notificações push (mobile) |
| 🔜 | Videoconferência integrada |
| 🔜 | Exportação de relatórios PDF |
| 🔜 | Publicação na Play Store via TWA |
| 🔜 | Multi-idioma (PT / ES / EN) |

---

## Autor

Desenvolvido com ❤️ por **Bernard De Freitas**

[![GitHub](https://img.shields.io/badge/GitHub-Bernard301094-181717?logo=github&style=flat-square)](https://github.com/Bernard301094)

---

<p align="center">
  © 2025 Bernard De Freitas · Todos os direitos reservados · Uso privado
</p>
