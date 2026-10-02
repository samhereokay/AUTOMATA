#!/bin/bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <backup_file.dump> <target_database> [--reset-restore-db]"
  exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="$2"
RESET_DB=false

if [ "${3:-}" == "--reset-restore-db" ]; then
  RESET_DB=true
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' not found!"
  exit 1
fi

if [[ "$TARGET_DB" == "automata" ]] || [[ "$TARGET_DB" == "automata_test" ]]; then
  echo "Error: Cannot restore into '$TARGET_DB'. It is a protected database."
  exit 1
fi

# Ensure it has '_restore_test' or similar safety boundary, or just trust the previous check
if [[ "$TARGET_DB" != *"restore"* ]]; then
  echo "Error: Target database '$TARGET_DB' must contain the word 'restore' in its name for safety."
  exit 1
fi

echo "==> Preparing to restore into '$TARGET_DB'..."

# Check if DB exists
DB_EXISTS=$(docker exec -i automata-postgres psql -U automata -tAc "SELECT 1 FROM pg_database WHERE datname='$TARGET_DB'")

if [ "$DB_EXISTS" == "1" ]; then
  if [ "$RESET_DB" = true ]; then
    echo "==> Database '$TARGET_DB' exists. Dropping due to --reset-restore-db..."
    # Terminate active connections to allow drop
    docker exec -i automata-postgres psql -U automata -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TARGET_DB';" > /dev/null
    docker exec -i automata-postgres psql -U automata -c "DROP DATABASE \"$TARGET_DB\";"
  else
    echo "Error: Database '$TARGET_DB' already exists."
    echo "Use --reset-restore-db flag to forcefully drop and recreate it."
    exit 1
  fi
fi

echo "==> Creating database '$TARGET_DB'..."
docker exec -i automata-postgres psql -U automata -c "CREATE DATABASE \"$TARGET_DB\";"

echo "==> Restoring backup '$BACKUP_FILE' into '$TARGET_DB'..."
# Copy backup into container
REMOTE_BACKUP="/tmp/$(basename "$BACKUP_FILE")"
docker cp "$BACKUP_FILE" "automata-postgres:$REMOTE_BACKUP"

# Run pg_restore
# -d: target database
# -1: single transaction (either completely succeeds or rolls back)
# -U: user
echo "    Running pg_restore..."
docker exec -i automata-postgres pg_restore -U automata -d "$TARGET_DB" -1 "$REMOTE_BACKUP" || {
  echo "Error during pg_restore."
  docker exec -i automata-postgres rm "$REMOTE_BACKUP"
  exit 1
}

# Cleanup
docker exec -i automata-postgres rm "$REMOTE_BACKUP"

echo "==> Restore completed successfully!"
