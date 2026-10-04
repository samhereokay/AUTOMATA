const { Client } = require('pg');

async function run() {
  const client = new Client({
    user: 'automata',
    host: 'localhost',
    database: 'automata',
    password: 'automata_password',
    port: 5432,
  });
  
  await client.connect();
  
  const res = await client.query("SELECT id, nodes FROM workflow_entity WHERE id IN ('1dSFJgL340NlOBkh', 'PG84Tipt74DfpUvh')");
  
  for (const row of res.rows) {
    const nodes = row.nodes;
    for (const n of nodes) {
      if (n.type === 'n8n-nodes-base.webhook' && n.name === 'Automata Webhook') {
        n.parameters.responseMode = 'lastNode';
      }
    }
    await client.query("UPDATE workflow_entity SET nodes = $1 WHERE id = $2", [JSON.stringify(nodes), row.id]);
    console.log(`Updated ${row.id}`);
  }
  
  await client.end();
}

run().catch(console.error);
