# Backup e Restore do Banco de Dados

Scripts localizados em `scripts/backup-db.sh` e `scripts/restore-db.sh`.

---

## 1. Configuração inicial no servidor

```bash
# Copiar scripts para o servidor (se ainda não estiver lá via git pull)
cd /home/guilherme/apps/gynecology-practice/clinicawebapp

# Dar permissão de execução
chmod +x scripts/backup-db.sh
chmod +x scripts/restore-db.sh

# Criar diretório de backups
sudo mkdir -p /opt/backups/gynecology
sudo chown guilherme:guilherme /opt/backups/gynecology
```

---

## 2. Configurar cron job (execução diária às 3h)

```bash
crontab -e
```

Adicionar a linha ao final do arquivo:

```
0 3 * * * /home/guilherme/apps/gynecology-practice/clinicawebapp/scripts/backup-db.sh >> /var/log/gynecology-backup.log 2>&1
```

Para que o log seja criado com as permissões corretas na primeira vez:

```bash
sudo touch /var/log/gynecology-backup.log
sudo chown guilherme:guilherme /var/log/gynecology-backup.log
```

---

## 3. Testar o backup manualmente

```bash
cd /home/guilherme/apps/gynecology-practice/clinicawebapp
./scripts/backup-db.sh
```

Verificar que o arquivo foi criado:

```bash
ls -lh /opt/backups/gynecology/
```

---

## 4. Verificar que o backup está funcionando

### Ver os backups existentes
```bash
ls -lht /opt/backups/gynecology/
```

### Verificar o log do cron
```bash
tail -f /var/log/gynecology-backup.log
```

### Inspecionar o conteúdo de um backup (sem restaurar)
```bash
gunzip -c /opt/backups/gynecology/backup_2026-03-26_03-00.sql.gz | head -30
```

---

## 5. Restore em caso de emergência

```bash
cd /home/guilherme/apps/gynecology-practice/clinicawebapp

./scripts/restore-db.sh /opt/backups/gynecology/backup_2026-03-26_03-00.sql.gz
```

O script pedirá confirmação digitando `CONFIRMAR` antes de prosseguir.

> **Atenção:** o restore sobrescreve todos os dados atuais do banco. Em caso de dúvida,
> faça um backup manual antes de restaurar.

---

## Retenção

O script mantém automaticamente os **30 backups mais recentes** e apaga os mais antigos.
Com execução diária isso equivale a ~30 dias de histórico.
