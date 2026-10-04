const fs = require('fs');

const wfs = [
  '10591', '10597', '14410', '10242', '11181', '14429', '2703', '3859', '5148',
  '20028', '3586', '19932', '2557', '4352', '17010', '4640', '2768', '2883',
  '3291', '10326'
];

const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));

let results = [];
let matrixCsv = "Workflow ID,Workflow Name,Models,External Services,Credentials,Storage,Subworkflows,Security Level,Classification\n";
let securityCsv = "Workflow ID,Workflow Name,Security Issues,Security Level\n";

for (const id of wfs) {
  const data = JSON.parse(fs.readFileSync(`n8n_workflows/wf_${id}.json`));
  const meta = selected.find(s => String(s.workflow_id) === String(id));
  
  let nodeTypes = new Set();
  let credentials = new Set();
  let parameters = [];
  let urls = new Set();
  let externalServices = new Set();
  let models = new Set();
  let storage = new Set();
  let subworkflows = new Set();
  let securityIssues = [];
  let isUnsafe = false;
  let customNodes = new Set();

  // FIRST PASS: Collect all data regardless of order
  data.nodes.forEach(n => {
    nodeTypes.add(n.type);
    
    if (n.credentials) {
      Object.keys(n.credentials).forEach(c => credentials.add(`n8n credential: ${c}`));
    }
    
    if (n.parameters) {
      parameters.push(n.parameters);
      
      // AI Models
      if (n.parameters.model) models.add(n.parameters.model);
      
      // URLs
      if (n.parameters.url) urls.add(n.parameters.url);
      
      // DB/Storage
      if (n.type.toLowerCase().includes('postgres')) storage.add('postgres');
      if (n.type.toLowerCase().includes('qdrant')) storage.add('qdrant');
      if (n.type.toLowerCase().includes('pinecone')) storage.add('pinecone');
      if (n.type.toLowerCase().includes('redis')) storage.add('redis');
      if (n.type.toLowerCase().includes('readwritefile')) storage.add('filesystem');
      
      // Security - command execution
      if (n.type.toLowerCase().includes('executecommand')) {
        securityIssues.push('Command execution node detected');
        isUnsafe = true;
      }
      
      // Security - hardcoded secrets
      const paramStr = JSON.stringify(n.parameters).toLowerCase();
      if (paramStr.includes('bearer ') || paramStr.includes('api_key') || paramStr.includes('apikey') || paramStr.includes('secret')) {
          if (!paramStr.includes('=')) {
              // rough heuristic for hardcoded
              securityIssues.push('Potential hardcoded secret or bearer token in parameters');
          }
      }
      if (paramStr.includes('$env')) {
          credentials.add('environment variable reference');
      }
    }
    
    // Subworkflows
    if (n.type.includes('executeWorkflow')) {
        subworkflows.add('executeWorkflow');
    }
    
    // External Services (explicit)
    const typeLower = n.type.toLowerCase();
    if (typeLower.includes('slack')) externalServices.add('slack');
    if (typeLower.includes('telegram')) externalServices.add('telegram');
    if (typeLower.includes('github')) externalServices.add('github');
    if (typeLower.includes('jira')) externalServices.add('jira');
    if (typeLower.includes('openai')) externalServices.add('openai');
    if (typeLower.includes('anthropic')) externalServices.add('anthropic');
    if (typeLower.includes('tavily')) externalServices.add('tavily');
    if (typeLower.includes('serpapi')) externalServices.add('serpapi');
    
    // Custom nodes
    if (!typeLower.startsWith('n8n-nodes-base.') && !typeLower.startsWith('@n8n/')) {
        customNodes.add(n.type);
    }
  });
  
  // URL checking
  urls.forEach(url => {
      if (url.includes('api.openai.com')) externalServices.add('openai');
      if (url.includes('api.tavily.com')) externalServices.add('tavily');
      if (url.includes('api.github.com')) externalServices.add('github');
  });

  // SECOND PASS: Classification based on collected data
  let classification = 'LOCAL_READY';
  let requiredChanges = [];
  let secLevel = securityIssues.length > 0 ? (isUnsafe ? 'CRITICAL' : 'MEDIUM') : 'LOW';

  let hasCloudAI = false;
  let hasLocalAI = false;
  let hasPaidExternal = false;
  let missingStorage = false;

  const nodeTypesArr = Array.from(nodeTypes);
  
  if (nodeTypesArr.some(t => t.includes('lmChatOpenAi') || t.includes('openAi'))) {
      const isVision = Array.from(models).some(m => String(m).includes('vision') || String(m).includes('dall-e'));
      if (isVision) {
          hasCloudAI = true;
      } else {
          hasLocalAI = true; // Assumes we can adapt via base URL
      }
  }
  
  if (nodeTypesArr.some(t => t.includes('lmChatAnthropic') || t.includes('lmChatGoogleGemini'))) {
      hasCloudAI = true;
  }
  
  if (nodeTypesArr.some(t => t.includes('lmChatOllama'))) {
      hasLocalAI = true;
  }
  
  if (externalServices.has('jira') || externalServices.has('tavily') || externalServices.has('serpapi')) {
      hasPaidExternal = true;
  }
  
  if (storage.has('pinecone') || storage.has('redis')) {
      missingStorage = true;
  }

  if (isUnsafe) {
      classification = 'UNSAFE';
      requiredChanges.push('Fix critical security issues');
  } else if (subworkflows.size > 0 || missingStorage) {
      classification = 'BLOCKED';
      if (subworkflows.size > 0) requiredChanges.push('Missing subworkflows');
      if (missingStorage) requiredChanges.push('Requires unsupported storage/DB');
  } else if (hasCloudAI || (hasPaidExternal && !hasLocalAI)) {
      classification = 'EXTERNAL_REQUIRED';
      requiredChanges.push('Depends on cloud AI or paid SaaS');
  } else if (hasLocalAI && !nodeTypesArr.some(t => t.includes('lmChatOllama'))) {
      classification = 'LOCAL_ADAPTABLE';
      requiredChanges.push('Point OpenAI credential to local Ollama base URL');
  } else {
      classification = 'LOCAL_READY';
      requiredChanges.push('Provide basic configuration/credentials');
  }

  const name = (data.name || meta.title).replace(/,/g, '');
  
  results.push({
      id: id,
      name: name,
      classification,
      secLevel,
      securityIssues: securityIssues,
      models: Array.from(models),
      externalServices: Array.from(externalServices),
      credentials: Array.from(credentials),
      storage: Array.from(storage),
      subworkflows: Array.from(subworkflows),
      customNodes: Array.from(customNodes),
      requiredChanges
  });
  
  matrixCsv += `${id},"${name}","${Array.from(models).join('|')}","${Array.from(externalServices).join('|')}","${Array.from(credentials).join('|')}","${Array.from(storage).join('|')}","${Array.from(subworkflows).join('|')}",${secLevel},${classification}\n`;
  securityCsv += `${id},"${name}","${securityIssues.join('|')}",${secLevel}\n`;
}

fs.writeFileSync('results/workflow_second_audit.json', JSON.stringify(results, null, 2));
fs.writeFileSync('results/workflow_dependency_matrix.csv', matrixCsv);
fs.writeFileSync('results/workflow_security_audit.csv', securityCsv);

let md = '# Automata Workflow Second Audit (Strict)\n\n';
md += '| ID | Workflow | Classification | Security Level | Required Changes | External Services | Storage | Subworkflows |\n';
md += '|---|---|---|---|---|---|---|---|\n';

results.forEach(r => {
    md += `| ${r.id} | ${r.name} | **${r.classification}** | ${r.secLevel} | ${r.requiredChanges.join(', ')} | ${r.externalServices.join(', ') || 'None'} | ${r.storage.join(', ') || 'None'} | ${r.subworkflows.join(', ') || 'None'} |\n`;
});

md += `\n## SUMMARY & IMPLEMENTATION ORDER\n
1. **[10591] Monitor exposed secrets in GitHub and CI logs with WhatsApp alerts**
   - **Status**: LOCAL_READY
   - **Why**: Pure orchestration (GitHub -> webhook -> Telegram/WhatsApp). No missing DBs, no subworkflows.
2. **[5148] Local chatbot with retrieval augmented generation (RAG)**
   - **Status**: LOCAL_READY
   - **Why**: Native Postgres/Qdrant support, native Ollama support. Fits perfectly into Automata's stack.
3. **[10597] Detect and route cybersecurity threats with SIEM, Slack, email and PagerDuty**
   - **Status**: LOCAL_READY (can swap Slack for Telegram locally)
   - **Why**: Vital routing logic.
4. **[2768] Create and approve AI social posts with OpenAI, Telegram and Blotato**
   - **Status**: LOCAL_ADAPTABLE
   - **Why**: Overriding OpenAI with local base URL works safely here. Uses standard Telegram bot credentials.
5. **[10242] Chat with a PDF using AI (OpenAI)**
   - **Status**: LOCAL_ADAPTABLE
   - **Why**: Standard RAG workflow; requires pointing OpenAI to Ollama endpoint, but very minimal dependencies.
`;

fs.writeFileSync('docs/AUTOMATA_WORKFLOW_SECOND_AUDIT.md', md);
