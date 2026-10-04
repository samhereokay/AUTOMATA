# Automata Workflow Second Audit (Strict)

| ID | Workflow | Classification | Security Level | Required Changes | External Services | Storage | Subworkflows |
|---|---|---|---|---|---|---|---|
| 10591 | [AUTOMATA][CYBERSECUR] Detect and route cybersecurity threats with SIEM Slack email and PagerDuty | **LOCAL_READY** | MEDIUM | Provide basic configuration/credentials | slack | postgres | None |
| 10597 | [AUTOMATA][CYBERSECUR] Monitor cybersecurity compliance and send weekly reports via SIEM Jira Post | **LOCAL_READY** | LOW | Provide basic configuration/credentials | None | postgres | None |
| 14410 | [AUTOMATA][CYBERSECUR] Automate cybersecurity threat analysis with GPT-4o CVSS scoring and risk rou | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 10242 | [AUTOMATA][CODING] Personalize resumes & cover letters with AI GitHub Pages and Google Drive | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai, telegram, github | None | None |
| 11181 | [AUTOMATA][DESIGN] Automate print-on-demand: design to Shopify with AI mockups & social promotion | **LOCAL_ADAPTABLE** | MEDIUM | Point OpenAI credential to local Ollama base URL | openai, slack | None | None |
| 14429 | [AUTOMATA][DOCUMENTS] Generate event e-ticket PDFs with QR codes using Google Workspace | **LOCAL_READY** | LOW | Provide basic configuration/credentials | None | None | None |
| 2703 | [AUTOMATA][ASSISTANT] AI agent : Google calendar assistant using OpenAI | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 3859 | [AUTOMATA][ASSISTANT] Ai customer support assistant · WhatsApp ready · works for any business | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | postgres | None |
| 5148 | [AUTOMATA][ARTIFICIAL] Local chatbot with retrieval augmented generation (RAG) | **LOCAL_READY** | LOW | Provide basic configuration/credentials | None | qdrant | None |
| 20028 | [AUTOMATA][DOCUMENTS] Create and send quote PDFs with OpenAI Gmail and Google Sheets | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 3586 | [AUTOMATA][DOCUMENTS] AI-powered WhatsApp chatbot 🤖📲 for text voice images & PDFs with memory 🧠 | **LOCAL_ADAPTABLE** | MEDIUM | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 19932 | [AUTOMATA][SOCIAL-MED] Generate social media posts and images with Groq OpenAI and Google Drive | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 2557 | [AUTOMATA][NEWS] Hacker News to video content | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 4352 | [AUTOMATA][SOCIAL-MED] AI-powered multi-social media post automation: Google Trends & Perplexity AI | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |
| 17010 | [AUTOMATA][SOCIAL-MED] Create and approve AI social posts with OpenAI Telegram and Blotato | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai, telegram | None | None |
| 4640 | [AUTOMATA][MONITORING] Competitor price monitoring with web scrapingGoogle Sheets & Telegram | **LOCAL_READY** | LOW | Provide basic configuration/credentials | telegram | None | None |
| 2768 | [AUTOMATA][RESEARCH] 🤖🔍 The ultimate free AI-powered researcher with Tavily web search & extract | **LOCAL_ADAPTABLE** | MEDIUM | Point OpenAI credential to local Ollama base URL | openai, tavily | None | None |
| 2883 | [AUTOMATA][RESEARCH] Open deep research - AI-powered autonomous research workflow | **LOCAL_READY** | LOW | Provide basic configuration/credentials | None | None | None |
| 3291 | [AUTOMATA][RESEARCH] 🔍🛠️Generate SEO-optimized WordPress content with AI powered perplexity resear | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai, telegram | None | None |
| 10326 | [AUTOMATA][DESIGN] Generate QA test cases from Figma designs to Google Sheets using GPT-4o-mini | **LOCAL_ADAPTABLE** | LOW | Point OpenAI credential to local Ollama base URL | openai | None | None |

## SUMMARY & IMPLEMENTATION ORDER

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
