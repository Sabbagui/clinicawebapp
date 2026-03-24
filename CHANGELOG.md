# CHANGELOG — clinicawebapp

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
