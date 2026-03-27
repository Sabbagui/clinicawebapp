# clinicawebapp — PROJECT.md

## Stack

- **Frontend:** Next.js 14 (App Router, React 18)
- **Backend:** NestJS 10 + Prisma 5 + PostgreSQL 15
- **Deploy:** Docker (docker-compose.prod.yml) em servidor Debian com Tailscale
- **Linguagem:** TypeScript (full-stack)
- **Estilo:** Tailwind CSS + lucide-react
- **Formulários:** React Hook Form + Zod
- **Estado global:** Zustand
- **Calendário:** FullCalendar (drag-to-reschedule)
- **PDF:** @react-pdf/renderer
- **Agendamento de tarefas:** @nestjs/schedule (lembretes)
- **Autenticação:** JWT + Passport (Local + JWT strategies) + refresh token rotation

---

## Arquitetura de módulos (Backend — NestJS)

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login (local), emissão de JWT (access 8h + refresh 7d), guard global, endpoint `/auth/refresh` |
| `users` | CRUD de usuários/funcionários; soft-delete |
| `patients` | CRUD de pacientes com CPF, endereço, contato de emergência, consentimento LGPD; soft-delete; endpoint de anonimização |
| `uploads` | Serve arquivos de `/uploads/*` protegidos por JWT (comprovantes de pagamento e despesas) |
| `appointments` | Agendamentos com status, tipo, drag-to-reschedule, filtros por data e médico |
| `doctor-schedule` | Grade de horários disponíveis por dia da semana + bloqueios pontuais |
| `medical-records` | Prontuários SOAP (subjetivo, objetivo, avaliação, plano), CID-10, prescrições (JSON) |
| `payments` | Pagamentos vinculados a consultas; métodos PIX/Dinheiro/Cartão etc. |
| `finance` | Relatórios financeiros com filtros de período |
| `expenses` | CRUD de despesas operacionais com categorias; extração de dados de PDF via pdf-parse |
| `audit` | Módulo global — loga todas as mutações com ator, IP, entidade e metadados |
| `notifications` | Serviço de lembretes via WhatsApp (opcional, via webhook externo) |
| `prisma` | Módulo global — instância compartilhada do PrismaService |

### Módulos do Frontend (App Router)

| Rota | Página |
|---|---|
| `/login` | Autenticação |
| `/dashboard` | Visão geral (painel) |
| `/dashboard/today` | Consultas do dia |
| `/dashboard/appointments` | Lista + calendário com drag-to-reschedule |
| `/dashboard/appointments/new` | Agendar nova consulta |
| `/dashboard/appointments/[id]` | Detalhe da consulta |
| `/dashboard/patients` | Lista de pacientes |
| `/dashboard/patients/new` | Cadastro de paciente |
| `/dashboard/patients/[id]` | Ficha do paciente |
| `/dashboard/patients/[id]/history` | Histórico de prontuários |
| `/dashboard/finance` | Relatório financeiro (abas: Receitas / Despesas) |
| `/dashboard/receivables` | Contas a receber |
| `/dashboard/staff` | Gerenciamento de equipe |
| `/dashboard/audit` | Logs de auditoria |

---

## Decisões de arquitetura

- **2025-03-20:** Autenticação via JWT com guard global no NestJS (`JwtAuthGuard`), exceto em rotas marcadas como públicas com `@Public()`.
- **2025-03-20:** Soft-delete para `Patient` e `User` (campo `deletedAt` + `isActive`). Queries sempre filtram `isActive: true`.
- **2025-03-22:** Datas sempre armazenadas em UTC no banco. Exibidas em `DD/MM/YYYY` no frontend usando `date-fns` com locale `pt-BR`.
- **2025-03-22:** Senhas de usuários hasheadas com `bcrypt` no `users.service` antes de salvar.
- **2025-03-22:** Audit module declarado como global — intercepta e registra operações sem acoplamento em cada módulo.
- **2025-03-22:** Frontend em produção publicado apenas via Tailscale IP (`100.74.93.53:3000`). Backend na rede interna Docker, acessado pelo frontend via `NEXT_PUBLIC_API_URL`.
- **2025-03-22:** Limite de 100 consultas retornadas por query de agendamentos para evitar sobrecarga.
- **2025-03-23:** FullCalendar integrado no frontend com suporte a drag-to-reschedule (muda a data/hora do agendamento via PATCH).
- **2025-03-23:** Lembretes de consulta implementados no serviço `reminders.service.ts` via `@nestjs/schedule`. WhatsApp é opcional (webhook configurável por env).
- **2025-03-23:** Prontuário médico em formato SOAP. Status: `DRAFT` (editável) ou `FINAL` (imutável, requer médico logado para finalizar).
- **2026-03-25:** Módulo de despesas implementado. Despesas são sempre registradas após o pagamento (sem status pendente/pago). Categorias gerenciáveis por admin/recepcionista. Extração de dados de PDF via `pdf-parse` (sem LLM). Comprovante opcional.
- **2026-03-25:** Dark mode implementado com `next-themes`. Toggle no header. Nova paleta de marca: terracota (`hsl(14 47% 52%)`) + verde sage. CSS variables em `globals.css`. FullCalendar requer overrides CSS específicos (`.dark .fc-*`) pois injeta seu próprio CSS.
- **2026-03-25:** Cores dos status de agendamento no calendário ajustadas para nova paleta terracota/sage.
- **2026-03-26:** Rate limiting no login: 5 tentativas por minuto via `@nestjs/throttler`. Swagger desabilitado em `NODE_ENV=production`. Arquivos de upload (`/uploads/*`) protegidos por JWT via `UploadsController`.
- **2026-03-26:** Volume Docker `uploads_data` adicionado ao `docker-compose.prod.yml` para persistir comprovantes entre rebuilds.
- **2026-03-27:** Requisitos mínimos de LGPD implementados: consentimento obrigatório no cadastro de paciente (checkbox + timestamp), endpoint `PATCH /patients/:id/anonymize` (ADMIN only) com audit log. Migration `20260327000000_add_lgpd_consent`.
- **2026-03-27:** Índice `[reminderSent, scheduledDate]` adicionado em `appointments` para otimizar cron de lembretes. Migration `20260327010000_add_reminder_sent_index`.
- **2026-03-27:** Refresh token implementado: access token expira em 8h, refresh token em 7d com `JWT_REFRESH_SECRET` separado. Frontend renova automaticamente via interceptor Axios sem re-login. Scripts de backup PostgreSQL criados em `scripts/backup-db.sh` e `scripts/restore-db.sh`.

---

## Modelos de dados (Prisma)

### Enums

- **UserRole:** `ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`
- **ExpenseCategory:** categorias de despesa gerenciadas no banco (ex: Aluguel, Material, Pessoal, etc.)
- **AppointmentStatus:** `SCHEDULED`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- **AppointmentType:** `FIRST_VISIT`, `FOLLOW_UP`, `EXAM`, `PROCEDURE`, `URGENT`
- **MedicalRecordStatus:** `DRAFT`, `FINAL`
- **PaymentMethod:** `PIX`, `CASH`, `CREDIT_CARD`, `DEBIT_CARD`, `BANK_TRANSFER`
- **PaymentStatus:** `PENDING`, `PAID`, `CANCELLED`, `REFUNDED`

### Modelos principais

- **User** — funcionários e médicos
- **Patient** — pacientes com CPF (único), endereço completo, contato de emergência, campos LGPD (`lgpdConsentGiven`, `lgpdConsentDate`, `lgpdConsentText`)
- **Appointment** — agendamentos com constraint única `(doctorId, date, startTime)`
- **DoctorSchedule** — grade semanal por médico; único por `(doctorId, dayOfWeek)`
- **DoctorBlockedSlot** — bloqueios pontuais de horário
- **MedicalRecord** — prontuário vinculado 1:1 a `Appointment`; SOAP + CID-10 + prescrições (JSON)
- **Payment** — pagamento vinculado 1:1 a `Appointment`; valor em centavos
- **Expense** — despesa operacional com categoria, valor, data, descrição, notas e comprovante (PDF opcional)
- **ExpenseCategory** — categorias de despesa (nome, descrição); gerenciáveis por admin/recepcionista
- **AuditLog** — log de auditoria com ator, role, ação, entidade, IP, user agent

---

## Bugs conhecidos / pendências técnicas

- [ ] Permissões de médico (`DOCTOR`) não estão sendo enforced em todas as rotas — guard de role faltando em alguns endpoints
- [ ] Busca de pacientes pode não filtrar corretamente em alguns cenários (verificar query de `patients.service`)
- [ ] Reminders: confirmar se o webhook de WhatsApp está sendo chamado corretamente em produção
- [ ] Tela de receivables (`/dashboard/receivables`): validar se os filtros de período estão alinhados com `finance.service`

---

## Variáveis de ambiente necessárias

### Root / Docker

| Variável | Descrição |
|---|---|
| `POSTGRES_USER` | Usuário do PostgreSQL |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL |
| `POSTGRES_DB` | Nome do banco de dados |
| `DATABASE_URL` | Connection string completa do Prisma |
| `JWT_SECRET` | Secret para assinar access tokens JWT |
| `JWT_REFRESH_SECRET` | Secret para assinar refresh tokens JWT (separado do JWT_SECRET) |
| `FRONTEND_PORT` | Porta do frontend (padrão: 3000) |
| `BACKEND_PORT` | Porta do backend (padrão: 3001) |
| `NEXT_PUBLIC_API_URL` | URL da API acessível pelo browser |
| `PGADMIN_DEFAULT_EMAIL` | Email do PgAdmin (opcional) |
| `PGADMIN_DEFAULT_PASSWORD` | Senha do PgAdmin (opcional) |

### Backend

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string Prisma |
| `JWT_SECRET` | Secret JWT (access token, expira em 8h) |
| `JWT_REFRESH_SECRET` | Secret JWT para refresh tokens (expira em 7d) |
| `PORT` | Porta do servidor NestJS (padrão: 3001) |
| `TZ` | Timezone (America/Sao_Paulo) |
| `WHATSAPP_WEBHOOK_URL` | URL do webhook de WhatsApp (opcional) |
| `WHATSAPP_API_KEY` | Chave de API do WhatsApp (opcional) |

### Frontend

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API (ex: http://localhost:3001) |

---

## Comandos úteis

```bash
# Desenvolvimento local com Docker
docker-compose up -d

# Build de produção
docker-compose -f docker-compose.prod.yml up -d --build

# Migrations
cd backend && npx prisma migrate dev

# Seed do banco
cd backend && npm run prisma:seed

# Prisma Studio (visualização do banco)
cd backend && npm run prisma:studio

# Gerar cliente Prisma após mudança no schema
cd backend && npm run prisma:generate

# Logs do backend em produção
docker-compose -f docker-compose.prod.yml logs -f backend

# Incluir PgAdmin em produção (opcional)
docker-compose -f docker-compose.prod.yml -f docker-compose.prod.admin.v1.yml up -d
```

---

## Arquivos-chave do projeto

```
backend/prisma/schema.prisma           # Schema do banco
backend/src/app.module.ts              # Módulo raiz (importa todos)
backend/src/main.ts                    # Entry point NestJS
backend/src/modules/auth/             # Autenticação JWT
backend/src/modules/appointments/     # Agendamentos
backend/src/modules/patients/         # Pacientes
backend/src/modules/medical-records/  # Prontuários SOAP
backend/src/modules/doctor-schedule/  # Grade de horários
backend/src/modules/notifications/    # Lembretes WhatsApp
backend/src/modules/audit/            # Auditoria global
frontend/src/app/(dashboard)/         # Páginas do painel
frontend/src/components/              # Componentes React
frontend/src/lib/api/client.ts        # Axios client com interceptor de refresh token
frontend/src/lib/stores/auth-store.ts # Zustand store de autenticação
docker-compose.prod.yml               # Deploy de produção
scripts/backup-db.sh                  # Backup automático do PostgreSQL
scripts/restore-db.sh                 # Restore de backup
BACKUP-SETUP.md                       # Instruções de configuração do cron de backup
.env.example                          # Modelo de variáveis de ambiente
```
