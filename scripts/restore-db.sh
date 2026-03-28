#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# restore-db.sh — Restaura backup do PostgreSQL via docker exec
# Uso: ./scripts/restore-db.sh /opt/backups/gynecology/backup_2026-03-26_03-00.sql.gz
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
CONTAINER="gynecology-practice-db"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# --- Valida argumento ---
if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <arquivo-de-backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  log "ERRO: arquivo não encontrado: $BACKUP_FILE"
  exit 1
fi

# --- Carrega variáveis do .env ---
if [[ ! -f "$ENV_FILE" ]]; then
  log "ERRO: arquivo .env não encontrado em $ENV_FILE"
  exit 1
fi

POSTGRES_USER=""
POSTGRES_PASSWORD=""
POSTGRES_DB=""

while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
  key="${key// /}"
  value="${value//\"/}"
  value="${value//\'/}"
  case "$key" in
    POSTGRES_USER)     POSTGRES_USER="$value" ;;
    POSTGRES_PASSWORD) POSTGRES_PASSWORD="$value" ;;
    POSTGRES_DB)       POSTGRES_DB="$value" ;;
  esac
done < "$ENV_FILE"

if [[ -z "$POSTGRES_USER" || -z "$POSTGRES_DB" ]]; then
  log "ERRO: POSTGRES_USER ou POSTGRES_DB não encontrados no .env"
  exit 1
fi

# --- Verifica container ---
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  log "ERRO: container '$CONTAINER' não está em execução"
  exit 1
fi

# --- Confirmação ---
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚠  ATENÇÃO: OPERAÇÃO DESTRUTIVA                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Banco de destino : $POSTGRES_DB"
echo "║  Container        : $CONTAINER"
echo "║  Arquivo          : $(basename "$BACKUP_FILE")"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Todos os dados atuais do banco serão SOBRESCRITOS."
echo ""
read -r -p "Digite 'CONFIRMAR' para continuar: " CONFIRM

if [[ "$CONFIRM" != "CONFIRMAR" ]]; then
  log "Restore cancelado pelo usuário."
  exit 0
fi

# --- Executa restore ---
log "Iniciando restore de: $BACKUP_FILE"

if gunzip -c "$BACKUP_FILE" \
    | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER" \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q; then
  log "Restore concluído com sucesso."
else
  log "ERRO: restore falhou."
  exit 1
fi
