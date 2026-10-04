const { Client } = require('pg');
const { execSync } = require('child_process');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://automata:automata@127.0.0.1:5432/automata'
});

async function run() {
  await client.connect();
  const res = await client.query(`SELECT id FROM workflow_entity WHERE name LIKE '%[AUTOMATA]%'`);
  
  for (const row of res.rows) {
    try {
      console.log(`Publishing workflow ${row.id}`);
      execSync(`docker exec automata-n8n n8n publish:workflow --id=${row.id}`);
    } catch (e) {
      console.error(`Failed to publish workflow ${row.id}`);
    }
  }

  await client.end();
}

run().catch(console.error);
