#!/bin/bash
set -euo pipefail

# Find the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

BACKUP_DIR="${DIR}/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/automata_${TIMESTAMP}.dump"

echo "==> Creating backup of 'automata' database..."
echo "==> Destination: $BACKUP_FILE"

# Run pg_dump inside the container. 
# -U automata: use the automata user
# -d automata: target database
# -F c: custom format (compressed, suitable for pg_restore)
docker exec -i automata-postgres pg_dump -U automata -F c -f "/tmp/automata_${TIMESTAMP}.dump" automata

# Copy it out of the container
docker cp "automata-postgres:/tmp/automata_${TIMESTAMP}.dump" "$BACKUP_FILE"

# Clean up inside the container
docker exec -i automata-postgres rm "/tmp/automata_${TIMESTAMP}.dump"

echo "==> Backup successfully created!"
ls -lh "$BACKUP_FILE"
