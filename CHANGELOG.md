# CHANGELOG — clinicawebapp

---

## [2026-03-26] — Módulo de despesas, dark mode e ajustes de paleta

### Feito
- **Módulo de despesas** implementado do zero (backend + frontend):
  - Modelo `Expense` + `ExpenseCategory` adicionados ao schema Prisma
  - Migration criada para as novas tabelas
  - Backend: módulo NestJS `expenses` com CRUD completo de despesas e categorias
  - Categorias padrão populadas no seed
  - Frontend: aba "Despesas" na página `/dashboard/finance`
  - Upload de comprovante PDF com extração de dados via `pdf-parse` (sem LLM)
  - Gerenciamento de categorias disponível para `ADMIN` e `RECEPTIONIST`
- **Dark mode** implementado:
  - Dependência `next-themes` adicionada
  - Toggle no header do dashboard
  - CSS variables atualizadas em `globals.css` com paleta terracota + verde sage
  - Overrides do FullCalendar para dark mode (`.dark .fc-*` no globals.css)
- **Paleta de marca** atualizada para terracota (`hsl(14 47% 52%)`) + verde sage
- **Status de agendamentos** no calendário com cores ajustadas para a nova paleta
- **KPI cards** da página Financeiro: classes `dark:` adicionadas para `bg-green-50`, `bg-yellow-50`, `bg-pink-50`, `bg-blue-50` (parcial — ver pendências)
- **package-lock.json** atualizado para incluir `next-themes` (evitava falha no `npm ci` do servidor)
- **Bug prontuário (500)**: colunas `cid10` e `prescriptions` estavam ausentes na tabela `medical_records` apesar da migration marcada como aplicada — corrigidas com `ALTER TABLE` manual no servidor
- **Servidor travando**: investigado; provável causa foi conexão de SSD solta — reencaixado

### Decisões tomadas
- Despesas sempre registradas após pagamento → sem campo de status (pago/pendente)
- Extração de PDF via `pdf-parse` puro, sem LLM (funciona para PDFs gerados digitalmente)
- Dark mode: `darkMode: ["class"]` no Tailwind; `next-themes` aplica classe `.dark` no `<html>`
- FullCalendar requer overrides CSS manuais — não responde à classe `.dark` automaticamente

### Pendências desta sessão
- Cards KPI "Despesas" e "Resultado" ainda com pastel claro no dark mode (classes `dark:` não aplicadas)
- Merge conflict em `frontend/src/app/(dashboard)/dashboard/staff/page.tsx` — precisa resolver para completar o merge `claude/elastic-franklin → main`

### Próximos passos
1. Resolver merge conflict em `staff/page.tsx`
2. Aplicar `dark:` nos cards "Despesas" e "Resultado" da página Financeiro
3. Verificar mesmos cards na página Cobranças (`/dashboard/receivables`)
4. Fazer `git pull` no servidor para aplicar todas as mudanças

---

## [2026-03-24] — Inicialização dos arquivos de contexto de sessão

### Feito
- Criado `PROJECT.md` com contexto completo do projeto (stack, módulos, decisões, bugs, variáveis de ambiente, comandos)
- Criado `CHANGELOG.md` com histórico de sessões (este arquivo)
- Skill `feature-handoff` lida e aplicada para estruturar o fluxo de handoff entre sessões

### Decisões tomadas
- Adotado o padrão da skill `feature-handoff` para manter continuidade entre sessões Claude Code / Codex
- PROJECT.md registra contexto permanente; CHANGELOG.md registra histórico cronológico

### Pendências desta sessão
- Nenhuma nova pendência criada — sessão de documentação apenas

### Próximos passos
- Verificar e corrigir login retornando HTTP 201 (adicionar `@HttpCode(200)` no auth controller)
- Implementar guards de role para rotas de `DOCTOR` ainda sem proteção
- Revisar e corrigir busca de pacientes no `patients.service`
- Testar transição automática `DRAFT → FINAL` em prontuários
- Validar funcionamento do webhook de WhatsApp para lembretes em produção

---

## [2026-03-24] — Calendar drag-to-reschedule, reminders e UX de prontuário

### Feito
- FullCalendar integrado com suporte a **drag-to-reschedule** — arrastar consulta no calendário salva nova data/hora via PATCH
- Serviço de **lembretes de consulta** implementado (`reminders.service.ts`) com `@nestjs/schedule`
- Lembretes enviados via WhatsApp (webhook configurável por env `WHATSAPP_WEBHOOK_URL`)
- Melhorias de UX no módulo de prontuário médico (medical records)
- Campo `reminderSent` adicionado ao modelo `Appointment` para rastrear lembretes já enviados

### Decisões tomadas
- Lembretes são opcionais: só disparam se `WHATSAPP_WEBHOOK_URL` estiver configurado
- Drag-to-reschedule usa endpoint PATCH existente — sem nova rota

### Pendências desta sessão
- Confirmar se webhook está sendo chamado corretamente em produção
- Auto-resolução de status de prontuário ainda não funcionando

### Próximos passos
- Testar lembretes em produção com webhook real
- Corrigir transição de status de prontuário

---

## [2026-03-23] — Segurança de permissões, busca de pacientes, datas PT-BR e acentuação

### Feito
- Corrigidas permissões de segurança (guards de role)
- Busca de pacientes revisada para filtrar corretamente
- Formato de datas padronizado para `DD/MM/YYYY` em todo o frontend
- Acentuação em português corrigida nos campos e labels

### Decisões tomadas
- Datas sempre armazenadas em UTC no banco; exibidas em PT-BR com `date-fns`
- Locale `pt-BR` aplicado globalmente no frontend

### Pendências desta sessão
- Permissões de médico (`DOCTOR`) podem ainda não estar completas em todos os endpoints

### Próximos passos
- Auditar todos os controllers do backend para garantir que guards de role estão aplicados

---

## [2026-03-23] — Redução de limite de consultas e correção de imports CSS

### Feito
- Limite de consultas na query de agendamentos reduzido para 100 (evita sobrecarga)
- Imports CSS do FullCalendar removidos e substituídos pela forma correta
- Carregamento de `.env` corrigido no seed do banco

### Decisões tomadas
- Limite de 100 registros por query de appointments como proteção de performance

---

## [2026-03-22] — Scheduling backend e calendário frontend

### Feito
- Módulo `doctor-schedule` implementado (grade semanal + bloqueios pontuais)
- Módulo `appointments` completo com todos os status e tipos
- Calendário no frontend integrado com FullCalendar
- Fluxo completo de agendamento: criar, visualizar, editar, cancelar

### Decisões tomadas
- Constraint única no banco: `(doctorId, date, startTime)` evita double-booking
- Duração padrão de consulta: 30 minutos (configurável por `slotMinutes` no `DoctorSchedule`)

---

## [2026-03-21] — Filtros de finance e appointments

### Feito
- Filtro de appointments aceita ranges em formato ISO
- Relatório financeiro inclui pagamentos criados no mesmo dia do filtro (same-day fix)

---

## [2026-03-20] — Prontuário SOAP (frontend)

### Feito
- Frontend de prontuário médico implementado (SOAP notes)
- Integração com backend para criação, edição e finalização de prontuários
- Suporte a CID-10 e prescrições (campo JSON)

---

## [2026-03-20] — Inicialização do projeto e infraestrutura

### Feito
- Estrutura monorepo criada (backend NestJS + frontend Next.js 14)
- Schema Prisma definido com todos os modelos principais
- Docker Compose para desenvolvimento e produção
- Autenticação JWT implementada com guard global
- Módulos core: `auth`, `users`, `patients`, `appointments`, `medical-records`, `payments`, `finance`, `audit`
- Scripts de bootstrap para produção
- Configuração de CORS e variáveis de ambiente
- Deploy em servidor Debian com Tailscale

### Decisões tomadas
- Monorepo com workspaces npm (frontend + backend)
- Soft-delete para pacientes e usuários (nunca deletar fisicamente)
- Audit module global — sem acoplamento nos outros módulos
- Frontend publicado apenas via Tailscale em produção
