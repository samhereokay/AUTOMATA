const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://automata:automata@automata-postgres:5432/automata'
});

async function run() {
  await client.connect();
  console.log("Connected to DB");

  const res = await client.query(`SELECT id, nodes FROM workflow_entity WHERE name LIKE '%[AUTOMATA]%'`);
  
  for (const row of res.rows) {
    const hasAutomataWebhook = row.nodes.some(n => n.type === 'n8n-nodes-base.webhook' && n.name === 'Automata Webhook');
    if (hasAutomataWebhook) {
      const webhookPath = row.id;
      // Check if it exists
      const existing = await client.query('SELECT 1 FROM webhook_entity WHERE "webhookPath" = $1 AND method = $2', [webhookPath, 'POST']);
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO webhook_entity ("webhookPath", method, node, "webhookId", "pathLength", "workflowId") 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [webhookPath, 'POST', 'Automata Webhook', null, null, row.id]
        );
        console.log(`Inserted webhook_entity for workflow ${row.id}`);
      }
    }
  }

  await client.end();
}

run().catch(console.error);
