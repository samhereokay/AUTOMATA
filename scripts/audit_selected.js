const fs = require('fs');

const wfs = [
  '10591', '10597', '14410', '10242', '11181', '14429', '2703', '3859', '5148',
  '20028', '3586', '19932', '2557', '4352', '17010', '4640', '2768', '2883',
  '3291', '10326'
];

const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));

let results = [];

for (const id of wfs) {
  const data = JSON.parse(fs.readFileSync(`n8n_workflows/wf_${id}.json`));
  const meta = selected.find(s => String(s.workflow_id) === String(id));
  
  let trigger = [];
  let aiNodes = new Set();
  let ollamaCompatible = false;
  let extApis = new Set();
  let creds = new Set();
  let paidDeps = new Set();
  let customNodes = new Set();
  let subWfs = new Set();
  let requiredChanges = [];
  
  data.nodes.forEach(n => {
    const type = n.type.split('.').pop();
    
    if (n.type.toLowerCase().includes('trigger') || type === 'webhook') trigger.push(type);
    if (n.credentials) Object.keys(n.credentials).forEach(c => creds.add(c));
    
    if (n.type === 'n8n-nodes-base.executeWorkflow' || n.type === '@n8n/n8n-nodes-langchain.toolWorkflow') {
      subWfs.add(type);
    }
    
    if (n.type.startsWith('@n8n/n8n-nodes-langchain.')) {
      if (type === 'lmChatOpenAi' || type === 'lmChatOllama' || type === 'openAi') {
        aiNodes.add(type);
      } else if (type === 'lmChatAnthropic' || type === 'lmChatGoogleGemini') {
        aiNodes.add(type);
      }
    }
    
    if (type === 'lmChatOllama') ollamaCompatible = true;
    if (type === 'lmChatOpenAi' && creds.has('openAiApi')) {
      // openAiApi credential allows overriding base URL in n8n 2.34.6
      if (n.parameters && n.parameters.model && (String(n.parameters.model).includes('vision') || String(n.parameters.model).includes('dall-e'))) {
        paidDeps.add('OpenAI Vision/DALL-E');
      } else {
        ollamaCompatible = true;
      }
    }
    if (type === 'openAi') {
      if (n.parameters && n.parameters.resource === 'image') paidDeps.add('OpenAI Image Gen');
    }
    
    if (['telegram', 'slack', 'googleSheets', 'gmail', 'github', 'jira', 'zendesk'].includes(type)) {
      extApis.add(type);
      if (['jira', 'zendesk'].includes(type)) paidDeps.add(type);
    }
  });
  
  let status = 'READY';
  if (subWfs.size > 0) {
    status = 'UNSUPPORTED';
    requiredChanges.push('Missing subworkflows');
  } else if (paidDeps.size > 0 || (!ollamaCompatible && aiNodes.size > 0)) {
    status = 'CLOUD';
    requiredChanges.push('Requires cloud AI/SaaS');
  } else if (ollamaCompatible && !aiNodes.has('lmChatOllama')) {
    status = 'ADAPTABLE';
    requiredChanges.push('Point OpenAI credential to LocalAI/Ollama URL');
  } else {
    status = 'READY';
    requiredChanges.push('Provide basic API credentials');
  }
  
  results.push({
    rank: 'P0/P1', 
    module: meta ? meta.category : 'General',
    workflow: data.name || meta.title,
    id: id,
    status,
    trigger: trigger.join(', ') || 'Manual',
    aiNode: Array.from(aiNodes).join(', ') || 'None',
    ollamaComp: ollamaCompatible ? 'Yes' : 'No',
    extApis: Array.from(extApis).join(', ') || 'None',
    creds: Array.from(creds).join(', ') || 'None',
    paidDeps: Array.from(paidDeps).join(', ') || 'None',
    customNodes: Array.from(customNodes).join(', ') || 'None',
    subWfs: Array.from(subWfs).join(', ') || 'None',
    reqChanges: requiredChanges.join(', ')
  });
}

let md = '# Automata Execution Readiness\n\n';
md += '| Rank | Automata Module | Workflow | ID | Status | Trigger | AI Node | Ollama Compatible? | External APIs | Credentials | Paid Dependencies | Custom Nodes | Subworkflow Dependencies | Required Changes | Verdict |\n';
md += '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';

results.forEach(r => {
  md += `| ${r.rank} | ${r.module} | ${r.workflow} | ${r.id} | ${r.status} | ${r.trigger} | ${r.aiNode} | ${r.ollamaComp} | ${r.extApis} | ${r.creds} | ${r.paidDeps} | ${r.customNodes} | ${r.subWfs} | ${r.reqChanges} | ${r.status} |\n`;
});

md += `\n## FIRST CONFIGURATION ORDER\n
1. **[10591] Monitor exposed secrets in GitHub and CI logs with WhatsApp alerts**
   - **Value**: High value for Automata cybersecurity orchestration module.
   - **Configuration**: Setup Github Webhook token + WhatsApp/Telegram API keys. Point any OpenAI nodes to local Ollama base URL.
2. **[10597] Detect and route cybersecurity threats with SIEM, Slack, email and PagerDuty**
   - **Value**: Extremely important template for routing security threats.
   - **Configuration**: Webhook configuration + Slack/PagerDuty API keys.
3. **[5148] Local chatbot with retrieval augmented generation (RAG)**
   - **Value**: Excellent completely local memory/RAG workflow execution template.
   - **Configuration**: No SaaS dependencies. Setup Postgres/Qdrant vector store and point all AI logic to \`lmChatOllama\` nodes.
4. **[2768] Create and approve AI social posts with OpenAI, Telegram and Blotato**
   - **Value**: Perfect execution template for content generation with human-in-the-loop approval mechanism.
   - **Configuration**: \`telegramApi\` bot token (requires a separate token for this workflow bot or routing into Automata Telegram router). Update base URL of \`lmChatOpenAi\` to local model endpoint.
5. **[2557] Open deep research - AI-powered autonomous research workflow**
   - **Value**: Strongest deep research template available.
   - **Configuration**: Needs API keys for search services (Tavily/SerpAPI) and requires overriding the OpenAI nodes to use a strong local model via the base URL override on \`openAiApi\`.
`;

fs.writeFileSync('docs/AUTOMATA_EXECUTION_READINESS.md', md);
