const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function main() {
  const cookie = fs.readFileSync('cookies.txt', 'utf8').split('\n').find(line => line.includes('n8n-auth'));
  if (!cookie) throw new Error("No n8n-auth cookie found");
  const cookieStr = cookie.split(';')[0];
  
  const headers = {
    'Cookie': cookieStr,
    'Content-Type': 'application/json'
  };

  const payload = {
    name: 'Telegram API',
    type: 'telegramApi',
    nodesAccess: [
      {
        nodeType: 'n8n-nodes-base.telegram',
        date: new Date().toISOString()
      }
    ],
    data: {
      accessToken: process.env.TELEGRAM_BOT_TOKEN
    }
  };

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing');
  }

  console.log('Creating Telegram credential...');
  try {
    const res = await axios.post('http://localhost:5678/rest/credentials', payload, { headers });
    console.log('Created credential ID:', res.data.data.id);

    // We also need to update the workflows.json to use the newly created credential ID
    const workflows = JSON.parse(fs.readFileSync('workflows.json', 'utf8'));
    for (const wf of workflows) {
      if (wf.name.includes('AUTOMATA Telegram Assistant')) {
        const telegramNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.telegram');
        if (telegramNode) {
          telegramNode.credentials = {
            telegramApi: {
              id: res.data.data.id,
              name: 'Telegram API'
            }
          };
        }
      }
    }
    fs.writeFileSync('workflows.json', JSON.stringify(workflows, null, 2));
    console.log('Updated workflows.json with new credential ID');
  } catch (e) {
    console.error('Failed to create credential:', e.response?.data || e.message);
  }
}

main().catch(console.error);
