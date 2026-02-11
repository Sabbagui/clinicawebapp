# 🚀 Início Rápido (Quick Start)

Para quem já tem Node.js e PostgreSQL instalados.

## Comandos Rápidos

```bash
# 1. Navegar para o projeto
cd C:\Users\sabba\gynecology-practice-app

# 2. Instalar dependências
npm install
cd frontend && npm install
cd ../backend && npm install && cd ..

# 3. Configurar variáveis de ambiente
cd backend
copy .env.example .env
# Edite o .env e configure DATABASE_URL e JWT_SECRET

cd ../frontend
copy .env.local.example .env.local
cd ..

# 4. Criar banco de dados PostgreSQL
# Via psql ou pgAdmin: CREATE DATABASE gynecology_practice;

# 5. Executar migrações
cd backend
npx prisma generate
npx prisma migrate dev --name init

# 6. (Opcional) Seed de dados iniciais
npx ts-node prisma/seed.ts

# 7. Executar aplicação
cd ..
npm run dev
```

## Acessar a Aplicação

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Swagger Docs**: http://localhost:3001/api/docs

## Credenciais Padrão (após seed)

**Administrador:**
- Email: `admin@example.com`
- Senha: `admin123`

**Médica:**
- Email: `doctor@example.com`
- Senha: `doctor123`

**Recepcionista:**
- Email: `reception@example.com`
- Senha: `reception123`

## Docker (Alternativa para PostgreSQL)

Se preferir usar Docker para o banco de dados:

```bash
# Iniciar PostgreSQL via Docker
docker-compose up -d postgres

# Parar
docker-compose down
```

Acesse pgAdmin em: http://localhost:5050
- Email: admin@admin.com
- Senha: admin

## Comandos Úteis

```bash
# Ver logs do backend
cd backend && npm run start:dev

# Ver logs do frontend
cd frontend && npm run dev

# Abrir Prisma Studio (GUI para o banco)
cd backend && npx prisma studio

# Criar nova migration
cd backend && npx prisma migrate dev --name nome_da_migration

# Reset do banco (CUIDADO: apaga tudo!)
cd backend && npx prisma migrate reset

# Build para produção
npm run build

# Executar testes
cd backend && npm test
cd frontend && npm test
```

## Estrutura de Pastas Importantes

```
gynecology-practice-app/
├── backend/
│   ├── src/modules/        # Módulos da aplicação
│   ├── prisma/             # Schema e migrations
│   └── .env               # Configurações (criar)
│
├── frontend/
│   ├── src/app/           # Páginas Next.js
│   ├── src/components/    # Componentes React
│   └── .env.local        # Configurações (criar)
│
└── README.md             # Documentação completa
```

## Próximos Passos

1. ✅ Configurar o sistema
2. 📖 Ler [FEATURES.md](FEATURES.md) para ver funcionalidades
3. 👨‍💻 Começar a desenvolver novas funcionalidades
4. 📱 Implementar integração WhatsApp
5. 🎨 Melhorar a interface do usuário

## Problemas?

- Consulte [SETUP.md](SETUP.md) para guia detalhado
- Consulte [README.md](README.md) para documentação completa
- Verifique os logs de erro no terminal

---

**Bom desenvolvimento! 💻**
