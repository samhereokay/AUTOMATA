const axios = require('axios');
const fs = require('fs');
require('dotenv').config();
axios.defaults.proxy = false;

async function main() {
  const cookie = fs.readFileSync('cookies.txt', 'utf8').split('\n').find(line => line.includes('n8n-auth'));
  if (!cookie) throw new Error("No n8n-auth cookie found");
  const cookieStr = cookie.split(';')[0];
  
  const headers = {
    'Cookie': cookieStr,
    'Content-Type': 'application/json'
  };

  const apiToken = process.env.API_AUTH_TOKEN;
  if (!apiToken) {
    throw new Error('API_AUTH_TOKEN is missing in .env');
  }

  // 1. Create or recreate the HTTP Header Auth Credential
  const credPayload = {
    name: 'Automata OS API',
    type: 'httpHeaderAuth',
    nodesAccess: [
      {
        nodeType: 'n8n-nodes-base.httpRequest',
        date: new Date().toISOString()
      }
    ],
    data: {
      name: 'Authorization',
      value: `Bearer ${apiToken}`
    }
  };

  console.log('Creating HTTP Header credential...');
  let credId;
  try {
    const res = await axios.post('http://localhost:5678/rest/credentials', credPayload, { headers });
    credId = res.data.data.id;
    console.log('Created credential ID:', credId);
  } catch (e) {
    // If it already exists, let's try to fetch credentials and find it
    console.log('Creation failed (maybe exists). Fetching credentials...');
    try {
      const getRes = await axios.get('http://localhost:5678/rest/credentials', { headers });
      const existing = getRes.data.data.find(c => c.name === 'Automata OS API' && c.type === 'httpHeaderAuth');
      if (existing) {
        credId = existing.id;
        console.log('Found existing credential ID:', credId);
        // Update it just in case
        await axios.put(`http://localhost:5678/rest/credentials/${credId}`, credPayload, { headers });
        console.log('Updated existing credential.');
      } else {
        throw new Error('Could not find existing credential and creation failed.');
      }
    } catch (innerErr) {
      console.error('Failed to resolve credential:', innerErr.response?.data || innerErr.message);
      return;
    }
  }

  // 2. Define the workflow
  const workflowPayload = {
    name: 'Pipeline Schedule',
    nodes: [
      {
        parameters: {
          rule: {
            interval: [
              {
                field: 'hours',
                expression: 1
              }
            ]
          }
        },
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1,
        position: [250, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: 'http://localhost:3000/api/news/run',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'httpHeaderAuth',
          sendBody: false,
          options: {}
        },
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4,
        position: [450, 300],
        credentials: {
          httpHeaderAuth: {
            id: credId,
            name: 'Automata OS API'
          }
        }
      }
    ],
    connections: {
      'Schedule Trigger': {
        main: [
          [
            {
              node: 'HTTP Request',
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    },
    active: true
  };

  console.log('Creating Schedule Workflow...');
  try {
    const res = await axios.post('http://localhost:5678/rest/workflows', workflowPayload, { headers });
    const id = res.data.data.id;
    const versionId = res.data.data.versionId;

    console.log(`Created workflow ID: ${id}. Activating with version ${versionId}...`);
    const actRes = await axios.post(`http://localhost:5678/rest/workflows/${id}/activate`, { versionId }, { headers });
    console.log('Activated:', actRes.status);
    console.log(`\nWorkflow Deployment Complete.`);
    console.log(`Workflow URL: http://localhost:5678/workflow/${id}`);
    
    // Save to a local json for verification
    fs.writeFileSync('workflow_verification.json', JSON.stringify(res.data.data, null, 2));
  } catch (e) {
    console.error('Failed to create workflow:', e.response?.data || e.message);
  }
}

main().catch(console.error);
