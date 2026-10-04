# Automata Embedding Verification

## 1. Ollama Inventory
- **Endpoint**: `http://localhost:11434`
- **Installed Models**: `qwen2.5:3b`
- **Model Details**: 3.1B parameters, `qwen2` family, `gguf` format, Q4_K_M quantization.
- **Capabilities**: `completion`, `tools`.
- **Embedding Support**: NO existing embedding-specific models are installed. While generative models sometimes have an `embedding_length` exposed in metadata, they are extremely inefficient for similarity search and are strictly generation models.

## 2. Automata Configuration
- **docker-compose.yml / .env.example**: Specifies `OLLAMA_MODEL=qwen2.5:3b` for generation. It does NOT specify `OLLAMA_EMBEDDING_MODEL`.
- **LocalEmbeddingProvider.ts**: Exists in `packages/news-intelligence/src/memory/`. It checks `process.env.OLLAMA_EMBEDDING_MODEL`. If unset, it defaults to `none`.

## 3. Existing Embedding Provider
- **Endpoint**: Inherits `OLLAMA_BASE_URL` (`http://localhost:11434/v1` -> rewrites to base `/api/embeddings`).
- **Behavior**: If a model is configured, it sends a `test` prompt to dynamically capture the `dimensions` before marking the provider as `AVAILABLE`. 
- **Current State**: Because the config defaults to `none`, the provider logs: *No OLLAMA_EMBEDDING_MODEL configured. EmbeddingProvider will remain UNAVAILABLE.*
- **Reuse**: The n8n workflow uses its own `@n8n/n8n-nodes-langchain.embeddingsOllama` node rather than the TS abstraction, but both securely utilize the identical REST API under the hood.

## 4. Qdrant
- **Endpoint**: `http://localhost:6333`
- **Collections**: `[]` (Empty)
- **Status**: The `rag_collection` required by workflow 5148 DOES NOT EXIST yet. This is advantageous because it means we are not locked into any specific vector dimension.

## 5. Model Compatibility
- **NO_EXISTING_EMBEDDING_MODEL**: There are no installed embedding-capable models in the current infrastructure.

## 6. 5148 Requirement
Workflow 5148 hardcodes `mxbai-embed-large:latest` (1024 dimensions). 
- **Is it strictly required?** No. 
- **Can it be changed?** Yes, completely safely. Because Qdrant currently has no collections, we can change the workflow's embedding model to ANY valid local embedding model. Once the model is chosen, the `vectorStoreQdrant` node will automatically create `rag_collection` with the dimensions of whatever model we select.

## 7. Decision
**NO_EMBEDDING_MODEL_AVAILABLE**

## 10. Next Steps / Model Selection Information
Workflow 5148 remains **BLOCKED** until an embedding model is explicitly selected and approved. 
To unlock RAG workflows and the `LocalEmbeddingProvider`, we need to select an embedding model to download.

**Information for Decision:**
- **Recommended Capability Class**: We need a dedicated text-embedding model (not a generative chat model).
- **Resource Requirements**: Embedding models are typically very small (under 1GB) and require very little RAM.
- **Expected Vector Dimensions**: 
  - `nomic-embed-text`: 768 dimensions (Highly recommended, standard, fast)
  - `mxbai-embed-large`: 1024 dimensions (Also excellent, currently hardcoded in 5148)
  - `all-minilm`: 384 dimensions (Very lightweight)
- **Compatibility**: Any of these will work flawlessly with both n8n and Automata's TS provider. 
