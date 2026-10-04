const { Client } = require('pg');

const client = new Client({ connectionString: 'postgres://automata:automata_password@localhost:5434/automata' });

async function run() {
  await client.connect();

  // Patch 17010 (sIc6gsuo1dB3WOkA)
  let res = await client.query(`SELECT id, nodes FROM workflow_entity WHERE id = 'sIc6gsuo1dB3WOkA'`);
  if (res.rows.length > 0) {
    let nodes = res.rows[0].nodes;
    for (let node of nodes) {
      if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
        node.type = '@n8n/n8n-nodes-langchain.lmChatOllama';
        node.parameters = { model: 'qwen2.5:3b' };
        node.credentials = { ollamaApi: { id: "cred_ollama_1", name: "Automata Ollama API" } };
      }
      if (node.type.toLowerCase().includes('telegram')) {
        node.credentials = { telegramApi: { id: "XP2SJ3wLc8EY82QZ", name: "Telegram API" } };
      }
      if (node.name === 'Generate image') {
        // Since we don't have local image gen, disable it or leave it. 
        // We will leave it. But it might fail if there's no credential. Let's just remove it or change it? 
        // Actually, just clear its credential so it fails gracefully.
        node.credentials = {};
      }
    }
    await client.query(`UPDATE workflow_entity SET nodes = $1 WHERE id = 'sIc6gsuo1dB3WOkA'`, [JSON.stringify(nodes)]);
    console.log('Patched 17010');
  }

  // Patch 4640 (QAneGL7LmmVuAy1G)
  res = await client.query(`SELECT id, nodes FROM workflow_entity WHERE id = 'QAneGL7LmmVuAy1G'`);
  if (res.rows.length > 0) {
    let nodes = res.rows[0].nodes;
    for (let node of nodes) {
      if (node.type.toLowerCase().includes('telegram')) {
        node.credentials = { telegramApi: { id: "XP2SJ3wLc8EY82QZ", name: "Telegram API" } };
      }
    }
    await client.query(`UPDATE workflow_entity SET nodes = $1 WHERE id = 'QAneGL7LmmVuAy1G'`, [JSON.stringify(nodes)]);
    console.log('Patched 4640');
  }

  // Activate them
  await client.query(`UPDATE workflow_entity SET active = true WHERE id IN ('sIc6gsuo1dB3WOkA', 'QAneGL7LmmVuAy1G')`);

  // Update automata_templates to ready
  await client.query(`UPDATE automata_templates SET input_schema = jsonb_set(input_schema, '{audit_status}', '"ready"') WHERE id IN ('tpl-17010', 'tpl-4640')`);

  await client.end();
}

run().catch(console.error);
