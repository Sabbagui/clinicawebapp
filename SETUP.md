# Guia de Instalação Passo a Passo

Este guia irá ajudá-lo a configurar o sistema do zero.

## ✅ Checklist de Instalação

- [ ] Node.js instalado
- [ ] PostgreSQL instalado
- [ ] Dependências instaladas
- [ ] Banco de dados criado
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações executadas
- [ ] Usuário admin criado

## Passo 1: Instalar Node.js

### Windows

1. Acesse: https://nodejs.org/
2. Baixe a versão LTS (recomendada)
3. Execute o instalador
4. Aceite os termos e clique em "Next"
5. Mantenha as opções padrão
6. Clique em "Install"
7. Aguarde a instalação
8. Clique em "Finish"

### Verificar Instalação

Abra um novo terminal (PowerShell ou CMD) e execute:

```bash
node --version
# Deve mostrar: v18.x.x ou superior

npm --version
# Deve mostrar: 9.x.x ou superior
```

Se os comandos funcionarem, Node.js está instalado corretamente! ✅

## Passo 2: Instalar PostgreSQL

### Windows

1. Acesse: https://www.postgresql.org/download/windows/
2. Clique em "Download the installer"
3. Baixe a versão mais recente (14 ou superior)
4. Execute o instalador
5. Siga o assistente de instalação:
   - Pasta de instalação: padrão
   - Componentes: marque todos
   - Diretório de dados: padrão
   - **IMPORTANTE**: Defina uma senha para o usuário postgres (anote!)
   - Porta: 5432 (padrão)
   - Locale: padrão

### Verificar Instalação

```bash
psql --version
# Deve mostrar: psql (PostgreSQL) 14.x ou superior
```

## Passo 3: Configurar o Projeto

### 3.1 Navegar até o Projeto

```bash
cd C:\Users\sabba\gynecology-practice-app
```

### 3.2 Instalar Dependências

```bash
# Instalar concurrently (para rodar frontend e backend juntos)
npm install

# Frontend
cd frontend
npm install

# Backend
cd ..\backend
npm install

# Voltar para raiz
cd ..
```

Isso pode levar alguns minutos. ☕

## Passo 4: Configurar Banco de Dados

### 4.1 Criar o Banco de Dados

**Opção 1: Usando pgAdmin (Interface Gráfica)**
1. Abra pgAdmin (instalado com PostgreSQL)
2. Conecte-se ao servidor PostgreSQL (senha que você definiu)
3. Clique com botão direito em "Databases"
4. Selecione "Create" > "Database"
5. Nome: `gynecology_practice`
6. Clique em "Save"

**Opção 2: Usando Terminal**
```bash
# Se o comando psql estiver disponível
createdb gynecology_practice -U postgres
```

## Passo 5: Configurar Variáveis de Ambiente

### 5.1 Backend

```bash
cd backend
copy .env.example .env
```

Edite o arquivo `backend\.env` (use Notepad ou VS Code):

```env
# Substitua SUA_SENHA pela senha do PostgreSQL
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/gynecology_practice?schema=public"

# Gere uma chave secreta aleatória
JWT_SECRET=mude-isso-para-uma-chave-super-secreta-123456

PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 5.2 Frontend

```bash
cd ..\frontend
copy .env.local.example .env.local
```

Edite o arquivo `frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Passo 6: Executar Migrações

```bash
cd ..\backend

# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate dev --name init
```

Se tudo der certo, você verá:
```
✔ Generated Prisma Client
✔ The migration has been applied successfully
```

## Passo 7: Criar Usuário Administrador

### Método 1: Usando Prisma Studio (Recomendado)

```bash
# No diretório backend
npx prisma studio
```

Isso abrirá uma interface web em `http://localhost:5555`

1. Clique em "User"
2. Clique em "Add record"
3. Preencha os campos:
   - **id**: (deixe auto-gerar)
   - **email**: `admin@example.com`
   - **password**: Veja abaixo como gerar
   - **name**: `Administrador`
   - **role**: `ADMIN`
   - **isActive**: `true`
4. Clique em "Save 1 change"

### Gerar Senha Hasheada

Abra um novo terminal Node.js:

```bash
node
```

Execute no console do Node:

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('admin123', 10).then(hash => {
  console.log(hash);
  process.exit();
});
```

Copie o hash gerado e cole no campo `password` do Prisma Studio.

### Método 2: Criar Script de Seed

Crie o arquivo `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Administrador',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Admin criado:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Execute:
```bash
npx ts-node prisma/seed.ts
```

## Passo 8: Executar a Aplicação

### Opção 1: Executar Tudo Junto

```bash
# Do diretório raiz
cd C:\Users\sabba\gynecology-practice-app
npm run dev
```

### Opção 2: Executar Separadamente

**Terminal 1 (Backend):**
```bash
cd backend
npm run start:dev
```

Aguarde até ver:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api/docs
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Aguarde até ver:
```
✓ Ready in Xms
- Local: http://localhost:3000
```

## Passo 9: Testar a Aplicação

1. **Abra o navegador** em `http://localhost:3000`
2. **Acesse a API** em `http://localhost:3001/api/docs`
3. **Faça login via Swagger**:
   - Clique em `/api/auth/login`
   - Clique em "Try it out"
   - Use as credenciais:
     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```
   - Copie o `access_token` retornado
   - Clique em "Authorize" no topo
   - Cole o token
   - Agora você pode testar todos os endpoints!

## 🎉 Pronto!

Seu sistema está funcionando! Agora você pode:

- Criar usuários
- Cadastrar pacientes
- Agendar consultas
- Gerenciar prontuários

## ⚠️ Problemas Comuns

### Erro: "Port 3000 is already in use"

Solução: Outra aplicação está usando a porta. Mude em `frontend\.env.local`:
```env
PORT=3001
```

### Erro: "database does not exist"

Solução: Crie o banco de dados PostgreSQL primeiro (Passo 4)

### Erro: "Prisma Client did not initialize yet"

Solução: Execute `npx prisma generate` no diretório backend

### Erro: "Connection refused" ao PostgreSQL

Solução:
1. Verifique se o PostgreSQL está rodando
2. Verifique a senha no `.env`
3. Verifique se a porta é 5432

## 📞 Precisa de Ajuda?

Consulte o arquivo README.md principal ou verifique os logs de erro.

---

**Boa sorte com seu sistema! 🚀**
