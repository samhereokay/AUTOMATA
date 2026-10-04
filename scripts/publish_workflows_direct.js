const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://automata:automata@automata-postgres:5432/automata'
});

async function run() {
  await client.connect();
  console.log("Connected to DB");

  const res = await client.query(`SELECT id, "versionId" FROM workflow_entity WHERE name LIKE '%[AUTOMATA]%'`);
  
  for (const row of res.rows) {
    try {
      await client.query(`
        INSERT INTO workflow_published_version ("workflowId", "publishedVersionId") 
        VALUES ($1, $2)
        ON CONFLICT ("workflowId") DO UPDATE SET "publishedVersionId" = $2
      `, [row.id, row.versionId]);
      console.log(`Published ${row.id}`);
    } catch (e) {
      console.error(`Failed to publish workflow ${row.id}:`, e.message);
    }
  }

  await client.end();
}

run().catch(console.error);
