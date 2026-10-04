const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, '../n8n_workflows');
const files = fs.readdirSync(workflowsDir).filter(f => f.startsWith('wf_') && f.endsWith('.json'));

async function run() {
  for (const file of files) {
    const wfPath = path.join(workflowsDir, file);
    const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

    if (wf.nodes.some(n => n.type === 'n8n-nodes-base.webhook')) {
      console.log(`Skipping ${file} - already has webhook`);
      continue;
    }

    const workflowId = wf.id || file.replace('wf_', '').replace('.json', '');

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

    wf.active = true;
    fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
    console.log(`Injected Webhook into ${file} (ID: ${workflowId})`);
  }
}

run().catch(console.error);
