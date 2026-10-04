const fs = require('fs');

const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));
const files = fs.readdirSync('n8n_workflows').filter(f => f.endsWith('.json'));
const validation = JSON.parse(fs.readFileSync('validation_report.json', 'utf8'));
const invalidIds = validation.invalidDetails.map(d => String(d.id));

// The 30 failed workflows don't have an ID in their JSON, so they are excluded anyway.
// But to be absolutely safe, let's just ensure we only pick files with an ID that are NOT in invalidIds.

let workflows = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync('n8n_workflows/' + file));
  if (data.id) {
    const workflowId = file.replace('wf_', '').replace('.json', '');
    if (invalidIds.includes(workflowId)) continue; // Skip invalid
    
    const meta = selected.find(s => String(s.workflow_id) === String(workflowId));
    if (meta) {
      meta.local_file = file;
      meta.nodes = data.nodes || [];
      meta.connections = data.connections || {};
      workflows.push(meta);
    }
  }
}

// Exactly 73 workflows should be left.
console.log(`Usable workflows analyzed: ${workflows.length}`);

const p0_modules = [
  { name: 'Cybersecurity intelligence/news', keywords: ['cyber', 'security', 'siem', 'cvss', 'threat'] },
  { name: 'Financial/forex news', keywords: ['finance', 'forex', 'stock', 'trading'] },
  { name: 'Web/deep research', keywords: ['research', 'search', 'tavily', 'scrape'] },
  { name: 'Telegram notifications', keywords: ['telegram'] },
  { name: 'GitHub/code review/auditor', keywords: ['github', 'code', 'pr', 'review'] },
  { name: 'PDF/document research', keywords: ['pdf', 'document'] },
  { name: 'Local Ollama assistant', keywords: ['ollama', 'local', 'assistant'] },
  { name: 'Social/content generation', keywords: ['social', 'post', 'linkedin', 'twitter', 'content'] }
];

const p1_modules = [
  { name: 'Monitoring/alerts', keywords: ['monitor', 'uptime', 'alert', 'tracker'] },
  { name: 'RAG/document memory', keywords: ['rag', 'memory', 'vector', 'qdrant', 'pinecone'] },
  { name: 'Image/design', keywords: ['image', 'design', 'figma', 'mockup'] },
  { name: 'Video', keywords: ['video', 'tiktok', 'youtube'] },
  { name: 'Email/Google Docs/Sheets', keywords: ['email', 'gmail', 'sheets', 'docs'] }
];

let selectedWorkflows = [];

workflows.forEach(wf => {
  let triggers = new Set();
  let services = new Set();
  let creds = new Set();
  let aiNodes = new Set();
  
  let hasExecuteWorkflow = false;
  let hasVisionOrAudio = false;
  let hasCloudVector = false;
  let hasPaidSaaS = false;
  let canUseCustomEndpoint = false;
  
  wf.nodes.forEach(n => {
    let typeName = n.type.split('.').pop();
    
    if (n.type.toLowerCase().includes('trigger') || typeName === 'webhook') triggers.add(typeName);
    
    if (n.credentials) Object.keys(n.credentials).forEach(c => creds.add(c));
    
    if (n.type === 'n8n-nodes-base.executeWorkflow' || n.type === '@n8n/n8n-nodes-langchain.toolWorkflow') hasExecuteWorkflow = true;
    
    if (typeName.toLowerCase().includes('openai') || typeName.toLowerCase().includes('gemini') || typeName.toLowerCase().includes('anthropic') || typeName.toLowerCase().includes('ollama')) {
      aiNodes.add(typeName);
      // lmChatOpenAi can take custom base URL. The 'openAi' regular node (e.g. DALL-E, Whisper) might not, or models might not be compatible.
      if (typeName === 'lmChatOpenAi' || typeName === 'openAi') canUseCustomEndpoint = true;
      if (n.parameters && n.parameters.model && (String(n.parameters.model).includes('vision') || String(n.parameters.model).includes('dall-e') || String(n.parameters.model).includes('whisper'))) {
         hasVisionOrAudio = true;
      }
    } else if (['qdrant', 'pinecone', 'supabase'].includes(typeName.toLowerCase())) {
      hasCloudVector = true;
      aiNodes.add(typeName);
    } else if (!n.type.startsWith('n8n-nodes-base.') || !['code','set','if','switch','noOp','stickyNote','wait','splitInBatches','merge','aggregate','filter','splitOut','limit','removeDuplicates', 'editImage'].includes(typeName)) {
      if (!n.type.toLowerCase().includes('trigger')) services.add(typeName);
    }
    
    if (['hubspot', 'zendesk', 'jira', 'salesforce'].includes(typeName.toLowerCase())) hasPaidSaaS = true;
  });
  
  let status = 'READY';
  
  if (hasExecuteWorkflow || wf.nodes.length === 0) status = 'UNSUPPORTED';
  else if (hasPaidSaaS || hasCloudVector || aiNodes.has('lmChatGoogleGemini') || aiNodes.has('lmChatAnthropic') || hasVisionOrAudio) status = 'CLOUD';
  else if (aiNodes.size > 0 && !canUseCustomEndpoint && !aiNodes.has('lmChatOllama')) status = 'CLOUD';
  else if (aiNodes.has('openAi') && !aiNodes.has('lmChatOpenAi')) status = 'ADAPTABLE'; // Might be doing something custom
  
  // Assign module
  let assignedModule = null;
  const searchStr = (wf.title + ' ' + (wf.category||'')).toLowerCase();
  
  for (const mod of p0_modules) {
    if (mod.keywords.some(k => searchStr.includes(k))) { assignedModule = { ...mod, rank: 'P0' }; break; }
  }
  if (!assignedModule) {
    for (const mod of p1_modules) {
      if (mod.keywords.some(k => searchStr.includes(k))) { assignedModule = { ...mod, rank: 'P1' }; break; }
    }
  }
  
  if (assignedModule && (status === 'READY' || status === 'ADAPTABLE')) {
    wf.status = status;
    wf.assignedModule = assignedModule;
    wf.trigger_str = Array.from(triggers).join(', ') || 'None';
    wf.services_str = Array.from(services).join(', ') || 'None';
    wf.creds_str = Array.from(creds).join(', ') || 'None';
    wf.ai_str = Array.from(aiNodes).join(', ') || 'None';
    selectedWorkflows.push(wf);
  }
});

// Sort by Module Rank, then Module Name
selectedWorkflows.sort((a, b) => {
  if (a.assignedModule.rank !== b.assignedModule.rank) return a.assignedModule.rank.localeCompare(b.assignedModule.rank);
  return a.assignedModule.name.localeCompare(b.assignedModule.name);
});

// Pick top 20 diverse workflows
let finalSelection = [];
let moduleCounts = {};
for (const wf of selectedWorkflows) {
  const modName = wf.assignedModule.name;
  if (!moduleCounts[modName]) moduleCounts[modName] = 0;
  if (moduleCounts[modName] < 3 && finalSelection.length < 20) { // Max 3 per module
    finalSelection.push(wf);
    moduleCounts[modName]++;
  }
}

let md = '# Automata Core Execution Templates (Top 20 Candidates)\n\n';
md += '| Rank | Module | Workflow | URL | Status | AI Provider | External Services | Credentials | Why Selected |\n';
md += '|---|---|---|---|---|---|---|---|---|\n';

finalSelection.forEach(wf => {
  const url = wf.source_url || `https://n8n.io/workflows/${wf.workflow_id}`;
  md += `| **${wf.assignedModule.rank}** | ${wf.assignedModule.name} | ${wf.title} | [Link](${url}) | **${wf.status}** | ${wf.ai_str} | ${wf.services_str} | ${wf.creds_str} | Strong ${wf.assignedModule.name} capabilities with local/API support |\n`;
});

md += '\n\n## Module Recommendations\n';
Object.keys(moduleCounts).forEach(m => {
  md += `- **${m}**: Selected ${moduleCounts[m]} workflows.\n`;
});

fs.writeFileSync('docs/AUTOMATA_WORKFLOW_SELECTION.md', md);
console.log('Saved to docs/AUTOMATA_WORKFLOW_SELECTION.md');
