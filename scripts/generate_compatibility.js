const fs = require('fs');

const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));
const files = fs.readdirSync('n8n_workflows').filter(f => f.endsWith('.json'));

let workflows = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync('n8n_workflows/' + file));
  if (data.id) {
    const workflowId = file.replace('wf_', '').replace('.json', '');
    const meta = selected.find(s => String(s.workflow_id) === String(workflowId));
    if (meta) {
      meta.local_file = file;
      meta.nodes = data.nodes || [];
      meta.connections = data.connections || {};
      workflows.push(meta);
    }
  }
}

let counts = { LOCAL: 0, HYBRID: 0, CLOUD: 0, UNSUPPORTED: 0 };
let md = '# n8n Workflow Compatibility Audit\n\n';
md += '| Priority | Module | Workflow | Community URL | Purpose | Trigger | Services | Credentials | AI Provider | Compatibility | Reason |\n';
md += '|---|---|---|---|---|---|---|---|---|---|---|\n';

workflows.forEach(wf => {
  let triggers = new Set();
  let services = new Set();
  let creds = new Set();
  let aiProviders = new Set();
  let hasExecuteWorkflow = false;
  let unknownNodes = new Set();
  
  // Basic node inspection
  wf.nodes.forEach(n => {
    // 1. Triggers
    if (n.type.toLowerCase().includes('trigger') || n.type === 'n8n-nodes-base.webhook') {
      triggers.add(n.type.split('.').pop());
    }
    
    // 2. Services & Credentials
    let typeName = n.type.split('.').pop();
    if (!n.type.startsWith('n8n-nodes-base.') || !['code','set','if','switch','noOp','stickyNote','wait','splitInBatches','merge','aggregate','filter','splitOut','limit','removeDuplicates'].includes(typeName)) {
      if (!n.type.toLowerCase().includes('trigger')) {
        services.add(typeName);
      }
    }
    if (n.credentials) {
      Object.keys(n.credentials).forEach(c => creds.add(c));
    }
    
    // 3. Subworkflows
    if (n.type === 'n8n-nodes-base.executeWorkflow' || n.type === '@n8n/n8n-nodes-langchain.toolWorkflow') {
      hasExecuteWorkflow = true;
    }
    
    // 4. AI Providers
    if (n.type.toLowerCase().includes('openai')) aiProviders.add('OpenAI');
    if (n.type.toLowerCase().includes('gemini') || n.type.toLowerCase().includes('palm')) aiProviders.add('Google Gemini');
    if (n.type.toLowerCase().includes('anthropic') || n.type.toLowerCase().includes('claude')) aiProviders.add('Anthropic');
    if (n.type.toLowerCase().includes('ollama')) aiProviders.add('Ollama');
    if (n.type.toLowerCase().includes('qdrant')) aiProviders.add('Qdrant');
    if (n.type.toLowerCase().includes('pinecone')) aiProviders.add('Pinecone');
    if (n.type.toLowerCase().includes('supabase')) aiProviders.add('Supabase');
  });
  
  wf.trigger_str = Array.from(triggers).join(', ') || 'None';
  wf.services_str = Array.from(services).join(', ') || 'None';
  wf.creds_str = Array.from(creds).join(', ') || 'None';
  wf.ai_str = Array.from(aiProviders).join(', ') || 'None';
  
  // Priority (P0, P1, P2)
  const cat = (wf.category || '').toLowerCase();
  const title = (wf.title || '').toLowerCase();
  
  if (['news','research','cybersecurity','coding','social','telegram','document','assistant'].some(c => cat.includes(c) || title.includes(c))) wf.priority = 'P0';
  else if (['monitoring','rag','email','google','image','video'].some(c => cat.includes(c) || title.includes(c))) wf.priority = 'P1';
  else wf.priority = 'P2';
  
  // Module mapping
  wf.module = cat || 'general';
  
  // COMPATIBILITY LOGIC
  let compat = 'LOCAL';
  let reason = 'Uses only local or basic logic nodes.';
  
  // Conditions for CLOUD
  if (aiProviders.has('Google Gemini') || aiProviders.has('Anthropic') || aiProviders.has('Pinecone') || aiProviders.has('Supabase')) {
    compat = 'CLOUD';
    reason = `Fundamentally dependent on cloud AI/Vector (${Array.from(aiProviders).join(', ')}).`;
  } else if (Array.from(services).some(s => ['hubspot', 'zendesk', 'jira', 'salesforce'].includes(s.toLowerCase()))) {
    compat = 'CLOUD';
    reason = 'Depends on heavy proprietary enterprise SaaS.';
  } else if (hasExecuteWorkflow) {
    // If it depends on another workflow, we mark it as UNSUPPORTED or HYBRID depending on if we have it
    // For now, mark as UNSUPPORTED for safety since we didn't link them
    compat = 'UNSUPPORTED';
    reason = 'Depends on another sub-workflow (executeWorkflow node).';
  } else if (wf.services_str !== 'None') {
    // Has external services like Google Sheets, Telegram, Slack
    if (aiProviders.has('OpenAI')) {
      // It has OpenAI. CAN it run locally?
      compat = 'HYBRID';
      reason = 'Requires external APIs (like Google/Telegram) + OpenAI (which can potentially be routed to LocalAI).';
    } else {
      compat = 'HYBRID';
      reason = 'Requires external APIs/services (e.g., Telegram, Google).';
    }
  } else if (aiProviders.has('OpenAI')) {
    compat = 'LOCAL';
    reason = 'Only uses OpenAI which we can override to point to LocalAI.';
  }
  
  // Count
  counts[compat]++;
  
  const url = wf.source_url || `https://n8n.io/workflows/${wf.workflow_id}`;
  md += `| **${wf.priority}** | ${wf.module} | [${wf.title}](${url}) | ${wf.title.substring(0,40)}... | ${wf.trigger_str} | ${wf.services_str} | ${wf.creds_str} | ${wf.ai_str} | **${compat}** | ${reason} |\n`;
  
  wf.compat = compat;
});

// Summary text
let summary = `\n\n### Summary\n\nLOCAL: ${counts.LOCAL}\nHYBRID: ${counts.HYBRID}\nCLOUD: ${counts.CLOUD}\nUNSUPPORTED: ${counts.UNSUPPORTED}\n`;
fs.writeFileSync('docs/WORKFLOW_COMPATIBILITY.md', md + summary);

// Output the counts to console for the agent to see
console.log(summary);

// List recommended 15-25 P0/P1 workflows
console.log('\nRECOMMENDED WORKFLOWS (P0/P1 & LOCAL/HYBRID):');
let recs = workflows.filter(w => (w.priority === 'P0' || w.priority === 'P1') && (w.compat === 'LOCAL' || w.compat === 'HYBRID'));
recs.slice(0, 25).forEach(w => console.log(`[${w.priority}] [${w.compat}] ${w.title}`));
