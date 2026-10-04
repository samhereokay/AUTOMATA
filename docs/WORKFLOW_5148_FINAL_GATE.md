# WORKFLOW 5148 FINAL GATE AUDIT

## 1. Node Inventory
- **n8n-nodes-base.formTrigger**: Receives .pdf file (unauthenticated)
- **@n8n/n8n-nodes-langchain.embeddingsOllama**: Generates embeddings (hardcoded `mxbai-embed-large:latest`)
- **@n8n/n8n-nodes-langchain.documentDefaultDataLoader**: Loads binary PDF
- **@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter**: Chunks 200, overlap 50
- **@n8n/n8n-nodes-langchain.vectorStoreQdrant**: Inserts into `rag_collection`
- **@n8n/n8n-nodes-langchain.chatTrigger**: Chat interface trigger
- **@n8n/n8n-nodes-langchain.agent**: ReAct Agent
- **@n8n/n8n-nodes-langchain.lmChatOllama**: Chat generation model (model unspecified, relies on node default)
- **@n8n/n8n-nodes-langchain.memoryBufferWindow**: Session memory
- **@n8n/n8n-nodes-langchain.vectorStoreQdrant**: Retrieves as tool `retriever`

## 2. AI Model Audit
- **Chat Model**: `lmChatOllama`. Uses local Ollama endpoint. Doesn't specify a model string in JSON, meaning we must explicitly configure it to use Automata's `qwen2.5:3b`.
- **Embedding Model**: `embeddingsOllama`. Hardcoded to `mxbai-embed-large:latest`.

## 3. Vector Database Audit
- **Store**: Qdrant
- **Collection**: `rag_collection`
- **Dimensions**: Implicitly defined by `mxbai-embed-large:latest` (1024 dimensions).
- **Match against Automata**: Automata has Qdrant (`automata-qdrant`), but the embedding dimensions and model must be aligned.

## 4. Data Ingestion Audit
- **Mechanism**: PDF file uploaded via n8n Form Trigger.
- **Dependencies**: None externally. Entirely local processing.

## 5. Retrieval Pipeline
- `Form Trigger` -> `Default Data Loader` -> `Recursive Character Text Splitter` -> `Embeddings Ollama` -> `Qdrant Vector Store` (insert).
- `Chat Trigger` -> `AI Agent` -> `Qdrant Vector Store` (tool) -> `Embeddings Ollama` -> `Ollama Chat Model`.
- **Verdict**: Completely local execution path. No hidden cloud dependencies.

## 6. Local Ollama Compatibility
- The chat model is compatible (we have `qwen2.5:3b`).
- **BLOCKER**: Automata's `LocalEmbeddingProvider.ts` and `.env.example` confirm that NO embedding model is currently configured or available (`OLLAMA_EMBEDDING_MODEL` defaults to `none`). Per instructions, I cannot download `mxbai-embed-large:latest`.

## 7. Security
- **Finding**: Unauthenticated Form Trigger accepts arbitrary PDF files. (Level: MEDIUM).
- **Finding**: No API keys or secrets hardcoded.

## 8. n8n Version Compatibility
- All nodes (Agent v2, VectorStoreQdrant v1.2, MemoryBufferWindow v1.3) are fully compatible with Automata n8n 2.34.6.

## 9. Required Changes
- **BLOCKER**: Missing embedding model in local infra.
- **REQUIRED**: Configure `qdrantApi` credentials. Configure `ollamaApi` credentials. Set Chat Model explicitly to `qwen2.5:3b`.
- **OPTIONAL**: Secure the webhook/form trigger.

## 10. Local-First Score
**BLOCKED**

## FINAL VERDICT
WORKFLOW 5148
CLASSIFICATION: BLOCKED
BLOCKERS: No embedding model exists in Automata infrastructure (defaults to 'none'). Workflow requires 'mxbai-embed-large:latest'. Instruction forbids downloading models.
REQUIRED CHANGES: Model download (BLOCKED), configure Qdrant/Ollama credentials, map Chat Model to qwen2.5:3b.
EXTERNAL DEPENDENCIES: None.
SECURITY STATUS: MEDIUM (Unauthenticated PDF upload form).
READY FOR CONFIGURATION: NO
