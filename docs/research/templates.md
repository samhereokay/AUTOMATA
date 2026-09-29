# Workflow Templates

## Repositories Evaluated
1. **ScraperNode/awesome-n8n-templates**
   - 8,600+ workflows. Huge variety.
   - Status: Excellent source for raw materials.
2. **Danitilahun/n8n-workflow-templates**
   - 2,000+ well-organized workflows.
3. **wassupjay/n8n-free-templates**
   - 200+ plug-and-play workflows, focused heavily on AI stacks, LLMs, and vector databases.
   - Status: Highly relevant for our AI Planner, Researcher, and Writer modules.
4. **enescingoz/awesome-n8n-templates**
   - 280+ templates covering Telegram, OpenAI, etc.

## Strategy for Automata
Instead of blindly importing these, Automata will:
1. Inspect the template for required credentials and inputs.
2. Strip out hardcoded paid APIs where local alternatives (Ollama/TTS) can substitute.
3. Wrap them in a standard JSON schema (Registry format) so the AI Planner understands their inputs/outputs.
4. Import them into the self-hosted n8n instance programmatically.
