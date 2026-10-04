import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://automata:automata_password@127.0.0.1:5434/automata',
});
