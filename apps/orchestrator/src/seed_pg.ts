import { db } from './database';

/**
 * Automata Platform Seed
 * Registers all 20 audited n8n templates with their verified statuses.
 *
 * Template statuses (from the second strict audit):
 *   ready               - Works with existing local infrastructure as-is
 *   adaptation_required - Needs OpenAI credential pointed to local Ollama endpoint
 *   configuration_required - Needs non-AI external credentials (Telegram, Slack, etc.)
 *   coming_soon         - Requires SaaS-only services (not locally deployable)
 */

async function seed() {
  // ─── Modules ─────────────────────────────────────────────────────────────────
  // One module = one logical Automata capability.
  // Multiple templates/workflows can serve the same module.
  const modules = [
    // P0 — Core capabilities
    {
      id: 'cyber-news',
      name: 'Cybersecurity Intelligence',
      description: 'Monitor and analyze cybersecurity threats, CVEs, and threat intelligence feeds',
      category: 'Security',
      priority: 0,
      status: 'ready',
    },
    {
      id: 'web-research',
      name: 'Web & Deep Research',
      description: 'Autonomous deep research using AI agents, web search, and knowledge synthesis',
      category: 'Research',
      priority: 0,
      status: 'ready',
    },
    {
      id: 'telegram-notif',
      name: 'Telegram Notifications',
      description: 'Send automated alerts, reports, and updates to Telegram channels/chats',
      category: 'Notifications',
      priority: 0,
      status: 'ready',
    },
    {
      id: 'github-audit',
      name: 'GitHub / Code Review & Auditor',
      description: 'Review code repositories, generate audit reports, and automate GitHub workflows',
      category: 'Development',
      priority: 0,
      status: 'adaptation_required',
    },
    {
      id: 'pdf-research',
      name: 'PDF & Document Research',
      description: 'Process PDFs and documents with RAG, extraction, and AI summarization',
      category: 'Research',
      priority: 0,
      status: 'adaptation_required',
    },
    {
      id: 'ollama-assistant',
      name: 'Local Ollama Assistant',
      description: 'Conversational AI assistant running fully locally via Ollama + RAG',
      category: 'Assistant',
      priority: 0,
      status: 'ready',
    },
    {
      id: 'social-gen',
      name: 'Social & Content Generation',
      description: 'Generate social media posts, articles, and content for multiple platforms',
      category: 'Marketing',
      priority: 0,
      status: 'adaptation_required',
    },
    // P1 — Extended capabilities
    {
      id: 'monitoring-alerts',
      name: 'Monitoring & Alerts',
      description: 'Monitor systems, prices, compliance, and send automated alerts',
      category: 'Operations',
      priority: 1,
      status: 'ready',
    },
    {
      id: 'image-design',
      name: 'Image & Design',
      description: 'AI-powered design generation, image processing, and visual content creation',
      category: 'Design',
      priority: 1,
      status: 'adaptation_required',
    },
  ];

  // ─── Templates ───────────────────────────────────────────────────────────────
  // These are the 20 audited n8n workflows mapped to their modules.
  // n8n_workflow_id must match the actual workflow ID in the running n8n instance.
  const templates = [
    // ── Cybersecurity Intelligence (cyber-news) ──────────────────────────────
    {
      id: 'tpl-10591',
      module_id: 'cyber-news',
      n8n_workflow_id: '10591',
      name: 'SIEM Threat Detection & Routing',
      description: 'Detect and route cybersecurity threats via SIEM, Slack, email, PagerDuty',
      audit_status: 'ready',
      ai_nodes: [],
      external_services: ['slack', 'email', 'postgres'],
      required_credentials: ['slackApi', 'smtp', 'postgres'],
    },
    {
      id: 'tpl-10597',
      module_id: 'cyber-news',
      n8n_workflow_id: '10597',
      name: 'Weekly Compliance Report',
      description: 'Monitor cybersecurity compliance and send weekly reports via PostgreSQL and email',
      audit_status: 'ready',
      ai_nodes: [],
      external_services: ['postgres', 'email'],
      required_credentials: ['postgres', 'smtp'],
    },
    {
      id: 'tpl-14410',
      module_id: 'cyber-news',
      n8n_workflow_id: '14410',
      name: 'GPT-4o Threat Analysis with CVSS Scoring',
      description: 'Automate cybersecurity threat analysis with CVSS scoring — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi'],
      external_services: [],
      required_credentials: ['openAiApi → ollamaApi'],
    },

    // ── GitHub / Code Review (github-audit) ─────────────────────────────────
    {
      id: 'tpl-10242',
      module_id: 'github-audit',
      n8n_workflow_id: '10242',
      name: 'AI Resume & Cover Letter Personalizer',
      description: 'Personalize resumes & cover letters with AI, GitHub Pages, Google Drive',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi'],
      external_services: ['telegram', 'github', 'googleDrive', 'googleSheets'],
      required_credentials: ['openAiApi → ollamaApi', 'telegramApi', 'githubApi'],
    },
    {
      id: 'tpl-11181',
      module_id: 'github-audit',
      n8n_workflow_id: '11181',
      name: 'Print-on-Demand Automation',
      description: 'Automate print-on-demand: design to Shopify with AI, mockups & social',
      audit_status: 'adaptation_required',
      ai_nodes: ['openAi'],
      external_services: ['shopify', 'slack'],
      required_credentials: ['openAiApi → ollamaApi', 'slackApi'],
    },
    {
      id: 'tpl-14429',
      module_id: 'github-audit',
      n8n_workflow_id: '14429',
      name: 'Event E-Ticket PDF Generator',
      description: 'Generate event e-ticket PDFs with QR codes using Google Workspace',
      audit_status: 'ready',
      ai_nodes: [],
      external_services: ['googleDrive', 'googleDocs', 'gmail', 'googleSheets'],
      required_credentials: [],
    },

    // ── Local Ollama Assistant (ollama-assistant) ────────────────────────────
    {
      id: 'tpl-2703',
      module_id: 'ollama-assistant',
      n8n_workflow_id: '2703',
      name: 'Google Calendar AI Assistant',
      description: 'AI agent for Google Calendar management — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi'],
      external_services: ['googleCalendar'],
      required_credentials: ['openAiApi → ollamaApi', 'googleCalendarOAuth2Api'],
    },
    {
      id: 'tpl-3859',
      module_id: 'ollama-assistant',
      n8n_workflow_id: '3859',
      name: 'WhatsApp Customer Support Assistant',
      description: 'Customer support assistant for WhatsApp — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi'],
      external_services: ['whatsApp', 'postgres'],
      required_credentials: ['openAiApi → ollamaApi', 'whatsAppApi', 'postgres'],
    },
    {
      id: 'tpl-5148',
      module_id: 'ollama-assistant',
      n8n_workflow_id: '5148',
      name: 'Local RAG Chatbot (Verified)',
      description: 'Local chatbot with RAG using Ollama + Qdrant — fully verified and configured',
      audit_status: 'ready',
      ai_nodes: ['embeddingsOllama', 'lmChatOllama'],
      external_services: ['qdrant'],
      required_credentials: ['ollamaApi', 'qdrantApi'],
    },

    // ── PDF / Document Research (pdf-research) ───────────────────────────────
    {
      id: 'tpl-20028',
      module_id: 'pdf-research',
      n8n_workflow_id: '20028',
      name: 'AI Quote PDF Generator',
      description: 'Create and send quote PDFs with AI, Gmail, Google Sheets — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi', 'openAi'],
      external_services: ['googleSheets', 'googleDrive', 'gmail'],
      required_credentials: ['openAiApi → ollamaApi', 'googleSheetsOAuth2Api'],
    },
    {
      id: 'tpl-3586',
      module_id: 'pdf-research',
      n8n_workflow_id: '3586',
      name: 'WhatsApp PDF/Voice/Image Chatbot',
      description: 'AI WhatsApp chatbot handling text, voice, images & PDFs — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['openAi', 'lmChatOpenAi'],
      external_services: ['whatsApp'],
      required_credentials: ['openAiApi → ollamaApi', 'whatsAppApi'],
    },

    // ── Social / Content Generation (social-gen) ─────────────────────────────
    {
      id: 'tpl-19932',
      module_id: 'social-gen',
      n8n_workflow_id: '19932',
      name: 'Social Media Posts with Groq + Google Drive',
      description: 'Generate social media posts and images — adapt to local models',
      audit_status: 'adaptation_required',
      ai_nodes: ['openAi', 'lmChatGroq'],
      external_services: ['googleDrive'],
      required_credentials: ['openAiApi → ollamaApi', 'groqApi → ollamaApi'],
    },
    {
      id: 'tpl-2557',
      module_id: 'social-gen',
      n8n_workflow_id: '2557',
      name: 'Hacker News to Video Content',
      description: 'Hacker News → AI-generated video content pipeline — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi', 'openAi'],
      external_services: ['hackerNews', 'youtube', 'twitter'],
      required_credentials: ['openAiApi → ollamaApi'],
    },
    {
      id: 'tpl-4352',
      module_id: 'social-gen',
      n8n_workflow_id: '4352',
      name: 'Multi-Platform Social Automation',
      description: 'Google Trends + Perplexity AI → social posts across multiple platforms',
      audit_status: 'adaptation_required',
      ai_nodes: ['openAi'],
      external_services: ['twitter', 'linkedin', 'googleSheets'],
      required_credentials: ['openAiApi → ollamaApi', 'twitterOAuth2Api', 'linkedInApi'],
    },

    // ── Telegram Notifications (telegram-notif) ──────────────────────────────
    {
      id: 'tpl-17010',
      module_id: 'telegram-notif',
      n8n_workflow_id: '17010',
      name: 'AI Social Posts with Telegram Approval',
      description: 'Create and approve AI social posts via Telegram — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi', 'openAi'],
      external_services: ['telegram', 'googleSheets'],
      required_credentials: ['openAiApi → ollamaApi', 'telegramApi'],
    },
    {
      id: 'tpl-4640',
      module_id: 'monitoring-alerts',
      n8n_workflow_id: '4640',
      name: 'Price Monitoring with Telegram Alerts',
      description: 'Competitor price monitoring with web scraping, Google Sheets & Telegram',
      audit_status: 'ready',
      ai_nodes: [],
      external_services: ['telegram', 'googleSheets'],
      required_credentials: ['telegramApi', 'googleSheetsOAuth2Api'],
    },

    // ── Web / Deep Research (web-research) ───────────────────────────────────
    {
      id: 'tpl-2768',
      module_id: 'web-research',
      n8n_workflow_id: '2768',
      name: 'Tavily AI Researcher',
      description: 'AI-powered researcher with Tavily web search — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi'],
      external_services: ['tavily'],
      required_credentials: ['openAiApi → ollamaApi', 'tavilyApi'],
    },
    {
      id: 'tpl-2883',
      module_id: 'web-research',
      n8n_workflow_id: '2883',
      name: 'Open Deep Research (OpenRouter)',
      description: 'Autonomous AI research workflow with OpenRouter — ready with OpenRouter key',
      audit_status: 'ready',
      ai_nodes: ['lmChatOpenRouter', 'chainLlm'],
      external_services: [],
      required_credentials: ['openRouterApi'],
    },
    {
      id: 'tpl-3291',
      module_id: 'web-research',
      n8n_workflow_id: '3291',
      name: 'SEO WordPress Content with Perplexity',
      description: 'SEO-optimized WordPress content via Perplexity research — adapt OpenAI → Ollama',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi', 'openAi'],
      external_services: ['wordpress', 'telegram'],
      required_credentials: ['openAiApi → ollamaApi', 'wordpressApi'],
    },

    // ── Image / Design (image-design) ────────────────────────────────────────
    {
      id: 'tpl-10326',
      module_id: 'image-design',
      n8n_workflow_id: '10326',
      name: 'Figma QA Test Case Generator',
      description: 'Generate QA test cases from Figma designs to Google Sheets via GPT-4o-mini',
      audit_status: 'adaptation_required',
      ai_nodes: ['lmChatOpenAi'],
      external_services: ['googleSheets'],
      required_credentials: ['openAiApi → ollamaApi', 'googleSheetsOAuth2Api'],
    },
  ];

  try {
    console.log('Seeding Automata Modules...');
    for (const mod of modules) {
      await db.query(
        `INSERT INTO automata_modules (id, name, description, category, status, dependencies)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           status = EXCLUDED.status`,
        [mod.id, mod.name, mod.description, mod.category, mod.status, JSON.stringify({ priority: mod.priority })]
      );
    }
    console.log(`  ✓ ${modules.length} modules seeded`);

    console.log('Seeding Automata Templates...');
    for (const tpl of templates) {
      await db.query(
        `INSERT INTO automata_templates (id, module_id, n8n_workflow_id, input_schema, output_schema)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           module_id = EXCLUDED.module_id,
           n8n_workflow_id = EXCLUDED.n8n_workflow_id,
           input_schema = EXCLUDED.input_schema`,
        [
          tpl.id,
          tpl.module_id,
          tpl.n8n_workflow_id,
          JSON.stringify({
            name: tpl.name,
            description: tpl.description,
            audit_status: tpl.audit_status,
            ai_nodes: tpl.ai_nodes,
            external_services: tpl.external_services,
            required_credentials: tpl.required_credentials,
          }),
          JSON.stringify({}),
        ]
      );
    }
    console.log(`  ✓ ${templates.length} templates seeded`);

    // Verify counts
    const modCount = await db.query('SELECT COUNT(*) FROM automata_modules');
    const tplCount = await db.query('SELECT COUNT(*) FROM automata_templates');
    console.log(`\nRegistry state: ${modCount.rows[0].count} modules, ${tplCount.rows[0].count} templates`);
    console.log('Seed complete ✓');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

seed();
