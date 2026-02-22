# Sistema de Gestão - Consultório de Ginecologia

Sistema completo para gerenciamento de consultórios de ginecologia, incluindo agendamentos, prontuários eletrônicos, integração com WhatsApp e muito mais.

## Setup Rápido

1. Instalar dependências no monorepo:
   npm install

2. Criar arquivos de ambiente locais:
   copy backend\.env.example backend\.env
   copy frontend\.env.example frontend\.env

3. Gerar cliente Prisma e aplicar migrações:
   cd backend
   npx prisma generate
   npx prisma migrate dev
   cd ..

4. Subir app (frontend + backend):
   npm run dev

## ðŸš€ Funcionalidades

### Implementadas
- âœ… AutenticaÃ§Ã£o e autorizaÃ§Ã£o com JWT
- âœ… GestÃ£o de usuÃ¡rios (Admin, MÃ©dico, Enfermeira, Recepcionista)
- âœ… Cadastro completo de pacientes
- âœ… Sistema de prontuÃ¡rios eletrÃ´nicos (SOAP)
- âœ… Estrutura para agendamentos
- âœ… Controle de pagamentos (Dinheiro, PIX, CartÃµes)
- âœ… API REST documentada com Swagger

### Em Desenvolvimento
- ðŸ”„ Sistema completo de agendamentos
- ðŸ”„ IntegraÃ§Ã£o com WhatsApp Business API
- ðŸ”„ Interface frontend completa
- ðŸ”„ Lembretes automÃ¡ticos de consultas
- ðŸ”„ RelatÃ³rios e anÃ¡lises

## ðŸ“‹ PrÃ©-requisitos

Antes de comeÃ§ar, vocÃª precisarÃ¡ ter instalado em sua mÃ¡quina:

- [Node.js](https://nodejs.org/) (v18 ou superior)
- [PostgreSQL](https://www.postgresql.org/) (v14 ou superior)
- [Git](https://git-scm.com/)

## ðŸ› ï¸ InstalaÃ§Ã£o

### 1. Instalar Node.js

**Windows:**
- Baixe o instalador em: https://nodejs.org/
- Execute o instalador e siga as instruÃ§Ãµes
- Reinicie o terminal apÃ³s a instalaÃ§Ã£o

**Verificar instalaÃ§Ã£o:**
```bash
node --version
npm --version
```

### 2. Instalar PostgreSQL

**Windows:**
- Baixe em: https://www.postgresql.org/download/windows/
- Execute o instalador
- Anote a senha do usuÃ¡rio postgres
- Mantenha a porta padrÃ£o (5432)

### 3. Clonar e Configurar o Projeto

```bash
# Navegar atÃ© o diretÃ³rio do projeto
cd C:\Users\sabba\gynecology-practice-app

# Instalar dependÃªncias do projeto raiz
npm install

# Instalar dependÃªncias do frontend
cd frontend
npm install

# Instalar dependÃªncias do backend
cd ../backend
npm install
```

### 4. Configurar Banco de Dados

```bash
# Criar o banco de dados PostgreSQL
# Abra o pgAdmin ou execute via terminal:
createdb gynecology_practice
```

### 5. Configurar VariÃ¡veis de Ambiente

**Backend:**
```bash
cd backend
copy .env.example .env
```

Edite o arquivo `.env` e configure:
```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/gynecology_practice?schema=public"
JWT_SECRET=altere-para-uma-chave-secreta-segura
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

**Frontend:**
```bash
cd ../frontend
copy .env.local.example .env.local
```

Edite o arquivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 6. Executar MigraÃ§Ãµes do Banco de Dados

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 7. Criar UsuÃ¡rio Administrador (Seed)

Crie um script de seed ou use o Prisma Studio:

```bash
npx prisma studio
```

No Prisma Studio, adicione um usuÃ¡rio admin:
- email: admin@example.com
- password: (serÃ¡ necessÃ¡rio hashear - veja abaixo)
- name: Administrador
- role: ADMIN

**Para gerar a senha hasheada, execute no Node.js:**
```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('sua-senha', 10).then(console.log);
```

## ðŸš€ Executando a AplicaÃ§Ã£o

### Modo Desenvolvimento

**OpÃ§Ã£o 1: Executar tudo de uma vez (do diretÃ³rio raiz):**
```bash
npm run dev
```

**OpÃ§Ã£o 2: Executar separadamente:**

Terminal 1 - Backend:
```bash
cd backend
npm run start:dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

A aplicaÃ§Ã£o estarÃ¡ disponÃ­vel em:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Swagger Docs: http://localhost:3001/api/docs

## ðŸ“š DocumentaÃ§Ã£o da API

Acesse a documentaÃ§Ã£o interativa Swagger em:
```
http://localhost:3001/api/docs
```

### Endpoints Principais

#### AutenticaÃ§Ã£o
- `POST /api/auth/login` - Login
- `POST /api/auth/me` - InformaÃ§Ãµes do usuÃ¡rio atual

#### UsuÃ¡rios
- `GET /api/users` - Listar usuÃ¡rios
- `POST /api/users` - Criar usuÃ¡rio (Admin)
- `GET /api/users/:id` - Obter usuÃ¡rio
- `DELETE /api/users/:id` - Deletar usuÃ¡rio (Admin)

#### Pacientes
- `GET /api/patients` - Listar pacientes
- `POST /api/patients` - Cadastrar paciente
- `GET /api/patients/:id` - Obter paciente com histÃ³rico
- `PATCH /api/patients/:id` - Atualizar paciente
- `DELETE /api/patients/:id` - Deletar paciente

## ðŸ—ï¸ Estrutura do Projeto

```
gynecology-practice-app/
â”œâ”€â”€ frontend/                 # AplicaÃ§Ã£o Next.js
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ app/             # Pages (App Router)
â”‚   â”‚   â”œâ”€â”€ components/      # Componentes React
â”‚   â”‚   â”œâ”€â”€ lib/            # UtilitÃ¡rios
â”‚   â”‚   â””â”€â”€ types/          # TypeScript types
â”‚   â””â”€â”€ public/             # Arquivos estÃ¡ticos
â”‚
â”œâ”€â”€ backend/                 # API NestJS
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ modules/        # MÃ³dulos da aplicaÃ§Ã£o
â”‚   â”‚   â”‚   â”œâ”€â”€ auth/       # AutenticaÃ§Ã£o
â”‚   â”‚   â”‚   â”œâ”€â”€ users/      # UsuÃ¡rios
â”‚   â”‚   â”‚   â”œâ”€â”€ patients/   # Pacientes
â”‚   â”‚   â”‚   â”œâ”€â”€ appointments/    # Agendamentos
â”‚   â”‚   â”‚   â””â”€â”€ medical-records/ # ProntuÃ¡rios
â”‚   â”‚   â”œâ”€â”€ common/         # CÃ³digo compartilhado
â”‚   â”‚   â”‚   â””â”€â”€ prisma/     # Prisma service
â”‚   â”‚   â””â”€â”€ config/         # ConfiguraÃ§Ãµes
â”‚   â””â”€â”€ prisma/
â”‚       â””â”€â”€ schema.prisma   # Schema do banco de dados
â”‚
â””â”€â”€ package.json            # Workspace root
```

## ðŸ”’ SeguranÃ§a e Conformidade

O sistema foi desenvolvido considerando:

- âœ… **LGPD (Lei Geral de ProteÃ§Ã£o de Dados)** - Brasil
- âœ… Criptografia de senhas com bcrypt
- âœ… AutenticaÃ§Ã£o JWT
- âœ… Controle de acesso baseado em roles
- âœ… ValidaÃ§Ã£o de dados de entrada
- âœ… ProteÃ§Ã£o contra SQL Injection (Prisma ORM)

### RecomendaÃ§Ãµes de ProduÃ§Ã£o
- Usar HTTPS
- Configurar rate limiting
- Implementar logs de auditoria
- Backup automÃ¡tico do banco de dados
- Configurar firewall
- Manter dependÃªncias atualizadas

## ðŸ§ª Testes

```bash
# Backend
cd backend
npm run test

# Frontend
cd frontend
npm run test
```

## ðŸ“¦ Build para ProduÃ§Ã£o

```bash
# Build completo
npm run build

# Executar em produÃ§Ã£o
cd backend
npm run start:prod

cd frontend
npm run start
```

## ðŸ”§ Tecnologias Utilizadas

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- React Hook Form
- Zod (Validation)

### Backend
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Swagger/OpenAPI
- Bcrypt

## ðŸ¤ Contribuindo

Este Ã© um projeto privado. Para sugestÃµes ou melhorias, entre em contato com a equipe.

## ðŸ“ž PrÃ³ximos Passos

1. **Implementar Agendamentos Completos**
   - CalendÃ¡rio interativo
   - Conflitos de horÃ¡rio
   - Tipos de consulta

2. **IntegraÃ§Ã£o WhatsApp**
   - WhatsApp Business API
   - Lembretes automÃ¡ticos
   - ConfirmaÃ§Ãµes de consulta

3. **Dashboard e RelatÃ³rios**
   - EstatÃ­sticas do consultÃ³rio
   - GrÃ¡ficos de atendimento
   - ExportaÃ§Ã£o de relatÃ³rios

4. **Melhorias na Interface**
   - Design system completo
   - Modo escuro
   - Acessibilidade

## ðŸ“„ LicenÃ§a

Propriedade privada. Todos os direitos reservados.

---

**Desenvolvido para gestÃ£o eficiente de consultÃ³rios ginecolÃ³gicos** ðŸ¥




