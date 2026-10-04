const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/tmp/wf_1d_fixed.json', 'utf8'));

// Find Webhook node and set responseMode = responseNode
const wh = data.find(n => n.type === 'n8n-nodes-base.webhook');
wh.parameters.options = { responseMode: 'responseNode' };

// Create Respond To Webhook node
const respondNode = {
  id: "respond-automata-injected-12345",
  name: "Automata Respond",
  type: "n8n-nodes-base.respondToWebhook",
  typeVersion: 1,
  position: [1000, 0],
  parameters: {
    respondWith: "allIncomingItems",
    options: {}
  }
};
data.push(respondNode);

// Read connections from DB to modify
const { execSync } = require('child_process');
const connStr = execSync('docker exec -i -e PGPASSWORD=automata_password automata-postgres psql -U automata -d automata -t -A -c "SELECT connections FROM workflow_entity WHERE id = \'1dSFJgL340NlOBkh\';"').toString().trim();
const connections = JSON.parse(connStr);

// Connect the last node(s) to the respond node
// 'Send Summary to Monitoring Channel' is the last node
if (connections['Send Summary to Monitoring Channel']) {
  connections['Send Summary to Monitoring Channel']['main'] = [[{"node":"Automata Respond","type":"main","index":0}]];
} else {
  connections['Send Summary to Monitoring Channel'] = { main: [[{"node":"Automata Respond","type":"main","index":0}]] };
}

fs.writeFileSync('/tmp/wf_1d_respond.json', JSON.stringify(data));
fs.writeFileSync('/tmp/wf_1d_conn.json', JSON.stringify(connections));
console.log('Done');
