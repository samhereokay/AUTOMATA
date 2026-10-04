const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgres://automata:automata@automata-postgres:5432/automata'
});

async function run() {
  await client.connect();
  console.log("Connected to DB");

  const res = await client.query('SELECT id, name, nodes, connections, active FROM workflow_entity');
  
  for (const row of res.rows) {
    const wf = {
      id: row.id,
      name: row.name,
      nodes: row.nodes,
      connections: row.connections,
      active: row.active
    };

    if (wf.nodes.some(n => n.type === 'n8n-nodes-base.webhook' && n.name === 'Automata Webhook')) {
      console.log(`Skipping ${wf.name} - already has webhook`);
      if (!wf.active) {
        await client.query('UPDATE workflow_entity SET active = true WHERE id = $1', [wf.id]);
        console.log(`Activated ${wf.id}`);
      }
      continue;
    }

    const workflowId = wf.id;

    const triggerNodes = wf.nodes.filter(n => {
      const typeStr = n.type ? n.type.toLowerCase() : '';
      const nameStr = n.name ? n.name.toLowerCase() : '';
      return typeStr.includes('trigger') || nameStr.includes('trigger') || n.type === 'n8n-nodes-base.emailReadImap';
    });

    if (triggerNodes.length === 0) {
      const nodesWithIncoming = new Set();
      Object.values(wf.connections || {}).forEach(outputs => {
        if (outputs.main) {
          outputs.main.forEach(targets => {
            if (targets) targets.forEach(t => nodesWithIncoming.add(t.node));
          });
        }
      });
      const rootNodes = wf.nodes.filter(n => !nodesWithIncoming.has(n.name) && n.type !== 'n8n-nodes-base.stickyNote');
      triggerNodes.push(...rootNodes);
    }

    const webhookNode = {
      "id": "webhook-automata-injected-" + Date.now() + Math.floor(Math.random()*1000),
      "name": "Automata Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [0, 0],
      "webhookId": workflowId,
      "parameters": {
        "path": workflowId,
        "responseMode": "lastNode",
        "options": {}
      },
      "typeVersion": 1.1
    };

    wf.nodes.push(webhookNode);
    if (!wf.connections) wf.connections = {};
    wf.connections["Automata Webhook"] = { "main": [ [] ] };

    for (const tNode of triggerNodes) {
      if (wf.connections[tNode.name] && wf.connections[tNode.name].main && wf.connections[tNode.name].main[0]) {
        wf.connections[tNode.name].main[0].forEach(target => {
          wf.connections["Automata Webhook"].main[0].push(target);
        });
      }
    }
    
    if (wf.connections["Automata Webhook"].main[0].length === 0 && triggerNodes.length > 0) {
       triggerNodes.forEach(tNode => {
           if (tNode.name !== "Automata Webhook") {
               wf.connections["Automata Webhook"].main[0].push({ node: tNode.name, type: "main", index: 0 });
           }
       });
    }

    // UPDATE DB
    await client.query(
      'UPDATE workflow_entity SET nodes = $1, connections = $2, active = true WHERE id = $3',
      [JSON.stringify(wf.nodes), JSON.stringify(wf.connections), wf.id]
    );
    console.log(`Updated and activated ${wf.name} (ID: ${workflowId})`);
  }

  await client.end();
}

run().catch(console.error);
