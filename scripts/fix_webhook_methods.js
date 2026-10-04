const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://automata:automata@automata-postgres:5432/automata'
});

async function run() {
  await client.connect();
  console.log("Connected to DB");

  const res = await client.query('SELECT id, name, nodes, connections FROM workflow_entity');
  
  for (const row of res.rows) {
    let modified = false;
    const nodes = row.nodes.map(n => {
      if (n.type === 'n8n-nodes-base.webhook' && n.name === 'Automata Webhook') {
        if (n.parameters.httpMethod !== 'POST') {
          n.parameters.httpMethod = 'POST';
          modified = true;
        }
      }
      return n;
    });

    if (modified) {
      await client.query(
        'UPDATE workflow_entity SET nodes = $1 WHERE id = $2',
        [JSON.stringify(nodes), row.id]
      );
      console.log(`Updated httpMethod to POST for ${row.name}`);
    }
  }

  await client.end();
}

run().catch(console.error);
