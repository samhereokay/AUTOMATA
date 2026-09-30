const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const N8N = 'http://localhost:5678';

async function main() {
  const cookie = fs.readFileSync('cookies.txt', 'utf8')
    .split('\n')
    .find(line => line.includes('n8n-auth'));
  if (!cookie) throw new Error('No n8n-auth cookie found');
  const cookieStr = cookie.split(';')[0];

  const headers = {
    'Cookie': cookieStr,
    'Content-Type': 'application/json'
  };

  const api = axios.create({ baseURL: N8N, headers });

  const workflows = JSON.parse(fs.readFileSync('workflows.json', 'utf8'));

  // Fetch ALL existing workflows (paginate if needed)
  const res = await api.get('/rest/workflows?limit=100');
  const allExisting = res.data.data;

  for (const wf of workflows) {
    // Find EVERY copy of this workflow by name, not just the first
    const matches = allExisting.filter(e => e.name === wf.name);

    for (const m of matches) {
      // Deactivate if active (suppress errors — may already be inactive)
      if (m.active) {
        console.log(`Deactivating ${wf.name} (id: ${m.id})...`);
        try {
          await api.post(`/rest/workflows/${m.id}/deactivate`, { versionId: m.versionId });
          // Small pause to allow n8n to release the webhook registration
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          console.log(`  (deactivate returned: ${e.response?.status} — continuing)`);
        }
      }

      // Delete the copy (n8n requires archiving before deletion)
      console.log(`Deleting ${wf.name} (id: ${m.id})...`);
      try {
        await api.post(`/rest/workflows/${m.id}/archive`);
        await api.delete(`/rest/workflows/${m.id}`);
        console.log(`  Deleted.`);
      } catch (e) {
        console.log(`  Delete/archive returned ${e.response?.status}: ${JSON.stringify(e.response?.data)}`);
      }
    }

    // Build the payload from the template
    const payload = {
      name: wf.name,
      nodes: JSON.parse(JSON.stringify(wf.nodes)), // deep copy so we don't mutate the template
      connections: wf.connections
    };

    // Inject TELEGRAM_CHAT_ID at deploy time.
    // workflows.json stores 'PLACEHOLDER_TELEGRAM_CHAT_ID' — no real ID is ever committed.
    // n8n receives a plain string; no $env expression access is needed at runtime.
    const telegramNode = payload.nodes.find(n => n.type === 'n8n-nodes-base.telegram');
    if (telegramNode && telegramNode.parameters) {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!chatId) throw new Error('TELEGRAM_CHAT_ID is not set in .env — cannot deploy Telegram workflow');
      if (telegramNode.parameters.chatId === 'PLACEHOLDER_TELEGRAM_CHAT_ID') {
        telegramNode.parameters.chatId = chatId;
        console.log(`Injected TELEGRAM_CHAT_ID into ${wf.name}`);
      }
    }

    // Pause before creating to ensure old webhooks are released
    await new Promise(r => setTimeout(r, 1000));

    console.log(`Creating ${wf.name}...`);
    const createRes = await api.post('/rest/workflows', payload);
    const id = createRes.data.data.id;
    const versionId = createRes.data.data.versionId;

    console.log(`Activating ${wf.name} (id: ${id}, version: ${versionId})...`);
    try {
      const actRes = await api.post(`/rest/workflows/${id}/activate`, { versionId });
      console.log(`✅ Activated ${wf.name}: HTTP ${actRes.status}`);
    } catch (e) {
      console.error(`❌ Failed to activate ${wf.name}:`, JSON.stringify(e.response?.data));
    }
  }

  console.log('\nDeployment complete.');
}

main().catch(err => {
  console.error('Fatal deploy error:', err.message);
  process.exit(1);
});
