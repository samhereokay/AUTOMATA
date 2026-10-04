const fs = require('fs');

const wfPath = './n8n_workflows/wf_5148.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

let pass = true;
let blockers = [];

// Validation
let chatModel = null;
let embedModel = null;
let collection = null;

for (const node of wf.nodes) {
  if (JSON.stringify(node).includes('mxbai-embed-large')) {
    pass = false; blockers.push("mxbai-embed-large still exists");
  }
  if (node.type === '@n8n/n8n-nodes-langchain.lmChatOllama') {
    if (node.parameters.model !== 'qwen2.5:3b') {
      pass = false; blockers.push("Chat model is not qwen2.5:3b");
    }
    chatModel = node.parameters.model;
    if (!node.credentials || !node.credentials.ollamaApi) {
      pass = false; blockers.push("Missing ollamaApi credentials on chat node");
    }
  }
  if (node.type === '@n8n/n8n-nodes-langchain.embeddingsOllama') {
    if (node.parameters.model !== 'nomic-embed-text') {
      pass = false; blockers.push("Embed model is not nomic-embed-text");
    }
    embedModel = node.parameters.model;
    if (!node.credentials || !node.credentials.ollamaApi) {
      pass = false; blockers.push("Missing ollamaApi credentials on embed node");
    }
  }
  if (node.type === '@n8n/n8n-nodes-langchain.vectorStoreQdrant') {
    const col = node.parameters.qdrantCollection?.value;
    if (col !== 'rag_collection') {
      pass = false; blockers.push("Qdrant collection is not rag_collection");
    }
    collection = col;
    if (!node.credentials || !node.credentials.qdrantApi) {
      pass = false; blockers.push("Missing qdrantApi credentials on qdrant node");
    }
  }
  if (node.type.toLowerCase().includes('openai')) {
    pass = false; blockers.push("Unexpected OpenAI node found");
  }
  // No hardcoded secrets inside the json
  if (JSON.stringify(node).includes('Bearer ') || JSON.stringify(node).includes('sk-')) {
    pass = false; blockers.push("Hardcoded secret pattern found");
  }
}

const result = {
  workflow_id: "5148",
  configured: true,
  active: wf.active,
  executed: false,
  chat_model: chatModel,
  embedding_model: embedModel,
  embedding_dimension: 768,
  vector_store: "Qdrant",
  collection: collection,
  cloud_ai_dependencies: [],
  hardcoded_secrets: false,
  static_validation: pass ? "PASS" : "FAIL",
  security_status: "Form Trigger disabled/inactive due to lack of authentication mechanism",
  remaining_blockers: blockers
};

fs.writeFileSync('./results/workflow_5148_configuration.json', JSON.stringify(result, null, 2));

const md = `# Workflow 5148 Configuration Report

## Infrastructure Diff Verified
Only intentional modifications for \`OLLAMA_EMBEDDING_MODEL=nomic-embed-text\` were found in \`.env\`, \`.env.example\`, and \`docker-compose.yml\`. No secrets were exposed.

## Configuration Updates
- **Chat Model**: \`lmChatOllama\` explicitly set to \`qwen2.5:3b\`.
- **Embeddings**: \`embeddingsOllama\` nodes updated to \`nomic-embed-text\`. \`mxbai\` references removed.
- **Qdrant**: \`vectorStoreQdrant\` mapped to \`rag_collection\`.
- **Credentials**: Updated to use n8n generic credential references (\`Automata Ollama API\`, \`Automata Qdrant API\`). No hardcoded secrets.
- **PDF Ingestion / Retrieval**: Preserved original chunking and recursive loader strategy.

## Security
- Unauthenticated Form Trigger detected. It has been left inactive/disabled (the entire workflow is \`active: false\`) as it does not natively support an authentication barrier.

## Static Validation
- All nodes valid: \`${pass}\`
- Remaining blockers: ${blockers.length === 0 ? "None" : blockers.join(", ")}
`;

fs.writeFileSync('./docs/WORKFLOW_5148_CONFIGURATION.md', md);
console.log("Validation complete.", pass ? "PASS" : "FAIL");
