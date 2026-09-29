const axios = require('axios');
const fs = require('fs');

async function main() {
  const cookie = fs.readFileSync('cookies.txt', 'utf8').split('\n').find(line => line.includes('n8n-auth'));
  const cookieStr = cookie.split('\t').pop();
  
  const headers = {
    'Cookie': 'n8n-auth=' + cookieStr,
    'Content-Type': 'application/json'
  };

  const workflows = [
    { name: "Research Workflow", webhookId: "research.web", path: "research", msg: "Mocked Web Research Result for: {{$json.body.prompt}}" },
    { name: "Writer Workflow", webhookId: "writer.general", path: "writer", msg: "Mocked Written Content for: {{$json.body.prompt}}" },
    { name: "Telegram Assistant", webhookId: "assistant.telegram", path: "telegram", msg: "Sent to Telegram: {{$json.body.prompt}}" },
    { name: "SSMA Content", webhookId: "ssma.content", path: "ssma", msg: "Posted to Social Media: {{$json.body.prompt}}" }
  ];

  for (const wf of workflows) {
    const payload = {
      name: wf.name,
      nodes: [
        {
          parameters: { httpMethod: "POST", path: wf.path, responseMode: "lastNode", options: {} },
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          typeVersion: 1,
          position: [ 250, 300 ],
          webhookId: wf.webhookId
        },
        {
          parameters: {
            values: { string: [ { name: "result", value: wf.msg } ] },
            options: {}
          },
          name: "Set Result",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [ 450, 300 ]
        }
      ],
      connections: {
        Webhook: { main: [ [ { node: "Set Result", type: "main", index: 0 } ] ] }
      }
    };

    console.log(`Creating ${wf.name}...`);
    const res = await axios.post('http://localhost:5678/rest/workflows', payload, { headers });
    const id = res.data.data.id;
    const versionId = res.data.data.versionId;

    console.log(`Created ${id}. Activating with version ${versionId}...`);
    const actRes = await axios.post(`http://localhost:5678/rest/workflows/${id}/activate`, { versionId }, { headers });
    console.log('Activated:', actRes.status);
  }
}

main().catch(console.error);
