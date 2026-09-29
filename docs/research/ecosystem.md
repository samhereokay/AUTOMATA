# Ecosystem Research

## n8n
- **API Authentication:** Uses `X-N8N-API-KEY` header for programmatic access (workflow execution, retrieval, creation). Webhooks can be secured via Basic Auth, Header Auth, or JWT.
- **AI Capabilities:** n8n recently released advanced AI agents and workflow builder nodes, making it easier to integrate LangChain-like capabilities directly within n8n.
- **Self-Hosted AI:** n8n strongly supports local AI stacks (Ollama, Qdrant, PostgreSQL) as part of their starter kits.

## Existing Similar Projects
- **n8n Self-Hosted AI Starter Kit:** Combines n8n, Ollama, Qdrant, and PostgreSQL using Docker Compose. We will use this as the baseline infrastructure.
- **Agent Frameworks (LangChain, AutoGen, CrewAI):** Powerful, but often require writing extensive code for new integrations. n8n bypasses this by providing visual nodes for 1000+ services.
