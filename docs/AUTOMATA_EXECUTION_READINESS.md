# Automata Execution Readiness

| Rank | Automata Module | Workflow | ID | Status | Trigger | AI Node | Ollama Compatible? | External APIs | Credentials | Paid Dependencies | Custom Nodes | Subworkflow Dependencies | Required Changes | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P0/P1 | cybersecurity | [AUTOMATA][CYBERSECUR] Detect and route cybersecurity threats with SIEM, Slack, email and PagerDuty | 10591 | READY | scheduleTrigger | None | No | slack | slackApi, smtp, postgres | None | None | None | Provide basic API credentials | READY |
| P0/P1 | cybersecurity | [AUTOMATA][CYBERSECUR] Monitor cybersecurity compliance and send weekly reports via SIEM, Jira, Post | 10597 | READY | scheduleTrigger | None | No | None | postgres, smtp | None | None | None | Provide basic API credentials | READY |
| P0/P1 | cybersecurity | [AUTOMATA][CYBERSECUR] Automate cybersecurity threat analysis with GPT-4o, CVSS scoring and risk rou | 14410 | ADAPTABLE | manualTrigger | lmChatOpenAi | Yes | None | openAiApi | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | coding | [AUTOMATA][CODING] Personalize resumes & cover letters with AI, GitHub Pages and Google Drive | 10242 | ADAPTABLE | chatTrigger, telegramTrigger, webhook, manualTrigger | lmChatOpenAi | Yes | googleSheets, telegram, github | openAiApi, googleSheetsOAuth2Api, googleDriveOAuth2Api, telegramApi, githubApi | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | design | [AUTOMATA][DESIGN] Automate print-on-demand: design to Shopify with AI, mockups & social promotion | 11181 | CLOUD | googleDriveTrigger | openAi | No | slack | None | OpenAI Image Gen | None | None | Requires cloud AI/SaaS | CLOUD |
| P0/P1 | documents | [AUTOMATA][DOCUMENTS] Generate event e-ticket PDFs with QR codes using Google Workspace | 14429 | READY | manualTrigger, googleSheetsTrigger | None | No | gmail, googleSheets | None | None | None | None | Provide basic API credentials | READY |
| P0/P1 | assistant | [AUTOMATA][ASSISTANT] AI agent : Google calendar assistant using OpenAI | 2703 | ADAPTABLE | chatTrigger | lmChatOpenAi | Yes | None | openAiApi, googleCalendarOAuth2Api | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | assistant | [AUTOMATA][ASSISTANT] Ai customer support assistant · WhatsApp ready · works for any business | 3859 | ADAPTABLE | whatsAppTrigger | lmChatOpenAi | Yes | None | openAiApi, whatsAppTriggerApi, whatsAppApi, postgres | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | artificial-intelligence | [AUTOMATA][ARTIFICIAL] Local chatbot with retrieval augmented generation (RAG) | 5148 | READY | formTrigger, chatTrigger | lmChatOllama | Yes | None | qdrantApi, ollamaApi | None | None | None | Provide basic API credentials | READY |
| P0/P1 | documents | [AUTOMATA][DOCUMENTS] Create and send quote PDFs with OpenAI, Gmail and Google Sheets | 20028 | ADAPTABLE | googleSheetsTrigger, gmailTrigger, googleSheetsTrigger, gmailTrigger | lmChatOpenAi, openAi | Yes | googleSheets, gmail | googleSheetsTriggerOAuth2Api, openAiApi, googleSheetsOAuth2Api, googleDriveOAuth2Api, gmailOAuth2 | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | documents | [AUTOMATA][DOCUMENTS] AI-powered WhatsApp chatbot 🤖📲 for text, voice, images & PDFs with memory 🧠 | 3586 | CLOUD | whatsAppTrigger | openAi, lmChatOpenAi | Yes | None | whatsAppTriggerApi, httpHeaderAuth, openAiApi, whatsAppApi | OpenAI Image Gen | None | None | Requires cloud AI/SaaS | CLOUD |
| P0/P1 | social-media | [AUTOMATA][SOCIAL-MED] Generate social media posts and images with Groq, OpenAI and Google Drive | 19932 | CLOUD | formTrigger | openAi | No | None | groqApi, openAiApi, googleDriveOAuth2Api | OpenAI Image Gen | None | None | Requires cloud AI/SaaS | CLOUD |
| P0/P1 | news | [AUTOMATA][NEWS] Hacker News to video content | 2557 | CLOUD | manualTrigger | lmChatOpenAi, openAi | No | None | openAiApi, googleDriveOAuth2Api, httpCustomAuth | OpenAI Image Gen | None | None | Requires cloud AI/SaaS | CLOUD |
| P0/P1 | social-media | [AUTOMATA][SOCIAL-MED] AI-powered multi-social media post automation: Google Trends & Perplexity AI | 4352 | CLOUD | scheduleTrigger | openAi | No | googleSheets | twitterOAuth2Api, linkedInCommunityManagementOAuth2Api, googleSheetsOAuth2Api, httpHeaderAuth, openAiApi | None | None | None | Requires cloud AI/SaaS | CLOUD |
| P0/P1 | social-media | [AUTOMATA][SOCIAL-MED] Create and approve AI social posts with OpenAI, Telegram and Blotato | 17010 | CLOUD | scheduleTrigger | lmChatOpenAi, openAi | Yes | telegram, googleSheets | openAiApi, telegramApi, blotatoApi, googleSheetsOAuth2Api | OpenAI Image Gen | None | None | Requires cloud AI/SaaS | CLOUD |
| P0/P1 | monitoring | [AUTOMATA][MONITORING] Competitor price monitoring with web scraping,Google Sheets & Telegram | 4640 | READY | scheduleTrigger | None | No | googleSheets, telegram | googleSheetsOAuth2Api, telegramApi | None | None | None | Provide basic API credentials | READY |
| P0/P1 | research | [AUTOMATA][RESEARCH] 🤖🔍 The ultimate free AI-powered researcher with Tavily web search & extract | 2768 | ADAPTABLE | chatTrigger | lmChatOpenAi | Yes | None | openAiApi | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | research | [AUTOMATA][RESEARCH] Open deep research - AI-powered autonomous research workflow | 2883 | READY | chatTrigger | None | No | None | openRouterApi, httpHeaderAuth | None | None | None | Provide basic API credentials | READY |
| P0/P1 | research | [AUTOMATA][RESEARCH] 🔍🛠️Generate SEO-optimized WordPress content with AI powered perplexity resear | 3291 | ADAPTABLE | formTrigger | lmChatOpenAi, openAi | Yes | telegram | wordpressApi, openAiApi, httpHeaderAuth, telegramApi | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |
| P0/P1 | design | [AUTOMATA][DESIGN] Generate QA test cases from Figma designs to Google Sheets using GPT-4o-mini | 10326 | ADAPTABLE | manualTrigger | lmChatOpenAi | Yes | googleSheets | httpHeaderAuth, openAiApi, googleSheetsOAuth2Api | None | None | None | Point OpenAI credential to LocalAI/Ollama URL | ADAPTABLE |

## FIRST CONFIGURATION ORDER

1. **[10591] Monitor exposed secrets in GitHub and CI logs with WhatsApp alerts**
   - **Value**: High value for Automata cybersecurity orchestration module.
   - **Configuration**: Setup Github Webhook token + WhatsApp/Telegram API keys. Point any OpenAI nodes to local Ollama base URL.
2. **[10597] Detect and route cybersecurity threats with SIEM, Slack, email and PagerDuty**
   - **Value**: Extremely important template for routing security threats.
   - **Configuration**: Webhook configuration + Slack/PagerDuty API keys.
3. **[5148] Local chatbot with retrieval augmented generation (RAG)**
   - **Value**: Excellent completely local memory/RAG workflow execution template.
   - **Configuration**: No SaaS dependencies. Setup Postgres/Qdrant vector store and point all AI logic to `lmChatOllama` nodes.
4. **[2768] Create and approve AI social posts with OpenAI, Telegram and Blotato**
   - **Value**: Perfect execution template for content generation with human-in-the-loop approval mechanism.
   - **Configuration**: `telegramApi` bot token (requires a separate token for this workflow bot or routing into Automata Telegram router). Update base URL of `lmChatOpenAi` to local model endpoint.
5. **[2557] Open deep research - AI-powered autonomous research workflow**
   - **Value**: Strongest deep research template available.
   - **Configuration**: Needs API keys for search services (Tavily/SerpAPI) and requires overriding the OpenAI nodes to use a strong local model via the base URL override on `openAiApi`.
