#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# backup-db.sh — Backup automático do PostgreSQL via docker exec
# Uso: ./scripts/backup-db.sh
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"
BACKUP_DIR="/opt/backups/gynecology"
CONTAINER="gynecology-practice-db"
KEEP_LAST=30
TIMESTAMP="$(date +%Y-%m-%d_%H-%M)"
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

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

# --- Cria diretório de backup ---
mkdir -p "$BACKUP_DIR"

# --- Executa pg_dump ---
log "Iniciando backup → $BACKUP_FILE"

if docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$CONTAINER" \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"; then
  SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"
  log "Backup concluído com sucesso. Tamanho: $SIZE"
else
  log "ERRO: pg_dump falhou"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# --- Remove backups antigos (mantém os últimos KEEP_LAST) ---
TOTAL="$(ls -1 "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | wc -l)"
if [[ "$TOTAL" -gt "$KEEP_LAST" ]]; then
  DELETE_COUNT=$(( TOTAL - KEEP_LAST ))
  ls -1t "$BACKUP_DIR"/backup_*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
  log "Removidos $DELETE_COUNT backup(s) antigos. Total atual: $KEEP_LAST"
fi
