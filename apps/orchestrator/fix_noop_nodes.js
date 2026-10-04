const { Client } = require('../../node_modules/pg');
async function run() {
  const client = new Client({
    user: 'automata',
    host: '127.0.0.1',
    database: 'automata',
    password: 'automata_password',
    port: 5434,
  });
  await client.connect();
  const res = await client.query("SELECT id, nodes FROM workflow_entity");
  for (const row of res.rows) {
    let modified = false;
    for (const node of row.nodes) {
      if (node.type === 'n8n-nodes-base.noOp') {
        if (node.webhookId) {
          delete node.webhookId;
          modified = true;
        }
        if (node.parameters && node.parameters.path) {
          delete node.parameters.path;
          modified = true;
        }
      }
    }
    if (modified) {
      await client.query("UPDATE workflow_entity SET nodes = $1 WHERE id = $2", [JSON.stringify(row.nodes), row.id]);
    }
  }
  await client.end();
  console.log("Cleaned up noOp nodes!");
}
run();
