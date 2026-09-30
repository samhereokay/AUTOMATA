# Backup and Restore Procedures

The Automation OS stores its primary data inside the PostgreSQL database `automata`.
These instructions cover how to safely backup and restore the database using the provided scripts.

## Important Definitions
* **`automata`**: The production database. NEVER restore over this unless during explicit disaster recovery.
* **`automata_restore_test`**: A dedicated database used solely to verify backups work.

---

## 1. Creating a Backup

The backup script uses `pg_dump` inside the active PostgreSQL Docker container. It produces a compressed custom-format (`-Fc`) backup that includes the full schema, constraints, migrations, and data.

**To create a backup:**
```bash
./database/backup.sh
```

**What it does:**
1. Connects to the `automata-postgres` container.
2. Runs `pg_dump` on the `automata` database safely (without exposing credentials).
3. Copies the resulting `.dump` file to `database/backups/`.

---

## 2. Restore Verification (Safe Test)

Routine restore verification ensures backups are healthy without risking production data.

**To verify a backup:**
```bash
# 1. Run the restore script targeting the safe test database
./database/restore.sh database/backups/automata_<TIMESTAMP>.dump automata_restore_test

# (If it already exists and you want to overwrite it, pass the safety flag)
./database/restore.sh database/backups/automata_<TIMESTAMP>.dump automata_restore_test --reset-restore-db

# 2. Run the automated data integrity verification script
node database/verify-restore.js
```

**What it does:**
1. Verifies the target database name is isolated (e.g. `automata_restore_test`) and refuses to overwrite production.
2. Drops and recreates the target database (if `--reset-restore-db` is used).
3. Restores the exact schema and data from the backup using `pg_restore`.
4. The `verify-restore.js` script asserts that the migration tables and expected row counts match.

---

## 3. Production Disaster Recovery (DANGER)

> [!CAUTION]
> This section is for true disaster recovery ONLY. Running these commands will destroy current state and replace it with the backup state. Do not run these lightly.

If you must recover the primary `automata` database:

1. Stop the application services so no new data is written:
   ```bash
   docker-compose stop automation-os n8n
   ```
2. Manually drop and recreate the `automata` database using `psql`:
   ```bash
   docker exec -it automata-postgres psql -U automata -c "DROP DATABASE automata;"
   docker exec -it automata-postgres psql -U automata -c "CREATE DATABASE automata;"
   ```
3. Copy the backup file into the container and restore it manually:
   ```bash
   docker cp database/backups/automata_<TIMESTAMP>.dump automata-postgres:/tmp/recovery.dump
   docker exec -it automata-postgres pg_restore -U automata -d automata -1 /tmp/recovery.dump
   ```
4. Restart the applications:
   ```bash
   docker-compose start
   ```

## Known Limitations
* This process backs up the PostgreSQL database but does not currently backup `qdrant` vector storage or `n8n` local files on disk. (n8n workflows stored in the database *are* backed up).
* Backups are stored locally in the `database/backups` directory. For true redundancy, you should sync this directory to an offsite location (e.g., AWS S3).
