import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';
import { loadConfig } from '../config';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations(connectionString?: string) {
  if (!connectionString) {
    const config = loadConfig();
    connectionString = config.databaseUrl;
  }
  
  if (!connectionString) {
    throw new Error('Database connection string is not set');
  }

  const pool = new Pool({ connectionString });
  let client: PoolClient | null = null;
  
  try {
    client = await pool.connect();
    
    // Acquire advisory lock to prevent concurrent migrations
    await client.query('SELECT pg_advisory_lock(88888888)');
    try {
      // Create migrations tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS automata_os_migrations (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Get executed migrations
      const executedRes = await client.query('SELECT name FROM automata_os_migrations');
      const executed = new Set(executedRes.rows.map(row => row.name));

      // Get available migrations
      const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

      console.log(`Found ${files.length} migration files.`);

      for (const file of files) {
        if (executed.has(file)) {
          console.log(`Skipping already executed migration: ${file}`);
          continue;
        }

        console.log(`Running migration: ${file}`);
        const filePath = path.join(MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        // Execute in transaction
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO automata_os_migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`Successfully completed migration: ${file}`);
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Error executing migration ${file}:`, err);
          throw err;
        }
      }
      
      console.log('All migrations executed successfully.');
    } finally {
      // Release advisory lock
      await client.query('SELECT pg_advisory_unlock(88888888)');
    }
  } catch (err) {
    console.error('Migration failed:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

if (process.argv[1] && (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'))) {
  runMigrations();
}

export { runMigrations };
