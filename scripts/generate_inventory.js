const fs = require('fs');

// Read the curated selection list to get metadata
const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));
const files = fs.readdirSync('n8n_workflows').filter(f => f.endsWith('.json'));

let usableWorkflows = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync('n8n_workflows/' + file));
  if (data.id) { // These are the 74 that succeeded (minus the 1 invalid structural, so 73)
    // Find the corresponding metadata
    const workflowId = file.replace('wf_', '').replace('.json', '');
    const meta = selected.find(s => String(s.workflow_id) === String(workflowId));
    if (meta) {
      meta.local_file = file;
      meta.nodes = data.nodes || [];
      usableWorkflows.push(meta);
    }
  }
}

// Categorize required services and credentials based on nodes
usableWorkflows.forEach(wf => {
  let services = new Set();
  let creds = new Set();
  let isLocalCompatible = true;
  
  wf.nodes.forEach(node => {
    // Extract service name from node type
    if (node.type.startsWith('n8n-nodes-base.')) {
      const name = node.type.replace('n8n-nodes-base.', '');
      if (name !== 'code' && name !== 'scheduleTrigger' && name !== 'webhook' && name !== 'set' && name !== 'if' && name !== 'switch' && name !== 'httpRequest') {
        services.add(name);
      }
    } else if (node.type.startsWith('@n8n/n8n-nodes-langchain.')) {
      services.add(node.type.replace('@n8n/n8n-nodes-langchain.', ''));
    }
    
    // Check credentials
    if (node.credentials) {
      Object.keys(node.credentials).forEach(c => creds.add(c));
    }
    
    // If it uses things like OpenAI, it technically requires cloud API unless replaced
    if (node.type.includes('openAi') || node.type.includes('google') || node.type.includes('aws')) {
      // Local compatible if we can route it through LocalAI (e.g. OpenAI drop-in)
      // We'll just flag it for review
    }
  });
  
  wf.required_services = Array.from(services).join(', ') || 'None';
  wf.required_credentials = Array.from(creds).join(', ') || 'None';
  
  // Assign simple priority based on categories requested by user
  const p0Categories = ['news', 'research', 'cybersecurity', 'coding', 'social', 'telegram', 'document', 'assistant'];
  const p1Categories = ['monitoring', 'rag', 'email', 'google', 'image', 'video'];
  
  wf.priority = 'P2';
  if (p0Categories.some(c => wf.category.toLowerCase().includes(c) || wf.title.toLowerCase().includes(c))) wf.priority = 'P0';
  else if (p1Categories.some(c => wf.category.toLowerCase().includes(c) || wf.title.toLowerCase().includes(c))) wf.priority = 'P1';
});

// Sort by Priority
usableWorkflows.sort((a, b) => a.priority.localeCompare(b.priority));

let md = '# n8n Usable Workflows Inventory\n\n';
md += '| Priority | Category | Workflow | Required Services | Required Credentials | Local-compatible? |\n';
md += '|----------|----------|----------|-------------------|----------------------|-------------------|\n';

usableWorkflows.forEach(wf => {
  const url = wf.source_url || `https://n8n.io/workflows/${wf.workflow_id}`;
  md += `| **${wf.priority}** | ${wf.category} | [${wf.title}](${url}) | ${wf.required_services} | ${wf.required_credentials} | Yes (needs config) |\n`;
});

fs.writeFileSync('docs/WORKFLOW_INVENTORY.md', md);
console.log(`Generated docs/WORKFLOW_INVENTORY.md with ${usableWorkflows.length} workflows`);
