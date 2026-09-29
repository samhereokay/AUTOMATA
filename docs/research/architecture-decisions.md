# Architecture Decisions

## 1. Execution Engine: n8n (Self-Hosted)
- **Why:** Massive ecosystem of integrations, visual debugging, robust API, and new native AI capabilities. It avoids reinventing workflow orchestration.
- **Role:** Handles all external API calls, complex data transformations, and step-by-step execution.

## 2. Universal Prompt & AI Planner (Backend)
- **Why:** The user shouldn't interact with n8n directly. A custom backend (Node.js/TypeScript) acts as the bridge.
- **Role:** Takes natural language intent -> LLM parses intent and outputs required capabilities/credentials -> maps to a workflow in the Registry -> triggers n8n via API.

## 3. Database Layer
- **Relational (PostgreSQL/SQLite):** Stores Users, Projects, Workflows Registry, Run logs, and Connections/Credentials (encrypted). SQLite is sufficient for single-tenant local-first; PostgreSQL for multi-tenant.
- **Vector (Qdrant):** Handles conversation memory, knowledge retrieval (RAG) for the Personal Assistant and Research workflows.

## 4. AI Providers
- **Local-first (Ollama):** Default provider for privacy and $0 cost.
- **Optional/External:** OpenAI, Gemini, Claude, etc., configurable via the UI.

## 5. Security & Credentials
- Credentials are NOT passed to LLMs. They are securely stored in the backend and passed to n8n either via n8n's Credential API or as environment variables injected at runtime, or configured once in the n8n instance and mapped via the registry.
