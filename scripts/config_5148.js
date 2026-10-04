const fs = require('fs');

const wfPath = './n8n_workflows/wf_5148.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

for (const node of wf.nodes) {
  if (node.type === '@n8n/n8n-nodes-langchain.lmChatOllama') {
    node.parameters.model = 'qwen2.5:3b';
    node.credentials = { ollamaApi: { id: "", name: "Automata Ollama API" } };
  } else if (node.type === '@n8n/n8n-nodes-langchain.embeddingsOllama') {
    node.parameters.model = 'nomic-embed-text';
    node.credentials = { ollamaApi: { id: "", name: "Automata Ollama API" } };
  } else if (node.type === '@n8n/n8n-nodes-langchain.vectorStoreQdrant') {
    node.credentials = { qdrantApi: { id: "", name: "Automata Qdrant API" } };
  }
}

fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2));
console.log("Updated workflow 5148.");
