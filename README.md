# AUTOMATA V1

**A self-hosted, curated n8n workflow library with an AI-powered workflow finder.**

Automata helps you discover, preview, and import pre-built n8n automation workflows into your own self-hosted n8n instance. Instead of searching the n8n template marketplace manually, you describe what you want to automate in plain language, and Automata recommends the best matching workflow from its curated library.

---

## What Automata Does

```
User opens Automata
  → types what they want to automate
  → AI router finds the best matching workflow from the curated library
  → user opens the workflow detail page
  → reviews requirements and credential needs
  → opens the original n8n template source
  → downloads the workflow JSON
  → imports it into their self-hosted n8n
  → configures credentials
  → runs the workflow
```

### What Automata Does NOT Do (V1)

- **Does not automatically execute workflows** inside your n8n instance
- **Does not create new workflows from scratch** — it matches from a curated library of 20 researched templates
- **Does not manage your n8n credentials** — you configure those inside n8n directly
- **Does not guarantee every workflow works out-of-the-box** — some require third-party API credentials and configuration

---

## Features

| Feature | Description |
|---|---|
| **Curated Workflow Library** | 20 researched and verified n8n workflow templates |
| **AI Workflow Finder** | Natural-language prompt routed via local Ollama to find the best matching workflow |
| **Workflow Detail Pages** | View requirements, credential needs, and status for each workflow |
| **Original Source Links** | Direct link to each workflow's original n8n template page |
| **Downloadable JSON** | One-click download of workflow JSON for n8n import |
| **Import Instructions** | Step-by-step guide on each detail page for importing into n8n |
| **Manual Browse & Filter** | Full catalog grid with category and status badges |
| **Graceful Fallback** | If the AI router is unavailable, users can browse the catalog manually |

---

## Architecture

```
┌─────────────────────────────────────┐
│            Browser (User)           │
│  http://localhost:3000              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Next.js Web App             │
│         (apps/web)                  │
│                                     │
│  /                 → Catalog + AI   │
│  /workflow/[id]    → Detail page    │
│  /api/route (POST) → AI Router     │
└──────────────┬──────────────────────┘
               │ (server-side fetch)
┌──────────────▼──────────────────────┐
│           Ollama (Local AI)         │
│     http://localhost:11434          │
│     Model: qwen2.5:3b              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│    Self-hosted n8n (separate)       │
│     http://localhost:5678           │
│     User imports JSON here          │
└─────────────────────────────────────┘
```

---

## Prerequisites

| Requirement | Details |
|---|---|
| **Node.js** | v20+ (Dockerfile uses `node:20-alpine`) |
| **npm** | Included with Node.js |
| **Git** | To clone the repository |
| **Ollama** | Required for the AI workflow finder. Optional if you only browse the catalog manually |
| **n8n** | Self-hosted n8n instance to import and run workflows. Not required to use the Automata library UI itself |
| **Docker & Docker Compose** | Optional — provided for containerized deployment |

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/samhereokay/AUTOMATA.git
cd AUTOMATA
```

### 2. Install Dependencies

```bash
npm ci
```

This installs dependencies for the entire monorepo (root + all workspaces).

### 3. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with your configuration. See [Configuration](#configuration) below.

### 4. Build the Web App

```bash
npm run build --workspace=@automata/web
```

---

## Configuration

The `.env` file controls the application's behavior. Create it from `.env.example`:

| Variable | Required | Purpose | Default / Example |
|---|---|---|---|
| `PORT` | No | Port for the web app | `3000` |
| `OLLAMA_BASE_URL` | Yes (for AI router) | URL where Ollama is running | `http://localhost:11434` |
| `OLLAMA_MODEL` | No | Ollama model name (note: V1 router currently uses `qwen2.5:3b` hardcoded in the API route) | `qwen2.5:3b` |
| `NODE_ENV` | No | Environment mode | `development` |
| `DATABASE_URL` | No (V1 library does not require PostgreSQL) | PostgreSQL connection string — used by the orchestrator, not the V1 library | `postgres://automata:automata_password@localhost:5434/automata` |
| `N8N_URL` | No | URL of your n8n instance — for future integration | `http://localhost:5678` |
| `N8N_API_KEY` | No | n8n API key — for future integration | — |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token — used by some workflows, not by Automata itself | — |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID | — |
| `API_AUTH_TOKEN` | No | Auth token for the orchestrator API (not used by V1 library) | `change-me` |
| `CORS_ORIGIN` | No | Allowed CORS origins | `*` |
| `LOG_LEVEL` | No | Logging verbosity | `info` |

> **Important**: Never commit your `.env` file. It is excluded by `.gitignore`.

---

## Running Locally

### Option A: Direct (Recommended for Development)

**1. Start Ollama** (if you want the AI workflow finder):

```bash
ollama serve
```

In a separate terminal, ensure the model is available:

```bash
ollama pull qwen2.5:3b
```

**2. Start the dev server:**

```bash
npm run dev --workspace=@automata/web
```

**3. Open your browser:**

```
http://localhost:3000
```

### Option B: Docker Compose

```bash
docker compose up -d automation-os
```

This starts:
- `automata-os` — the Next.js web app on port **3000** (uses `network_mode: "host"`)
- `automata-postgres` — PostgreSQL on port **5434** (required by docker-compose but not by the V1 library UI)

> **Note**: The Docker container uses `network_mode: "host"`, so it accesses Ollama at `127.0.0.1:11434` directly. Ollama must be running on the host machine.

### Verifying the Application

1. Open `http://localhost:3000` — you should see the **AUTOMATA V1** homepage with the workflow catalog grid.

2. Test the AI router:

```bash
curl -s -X POST http://localhost:3000/api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Monitor competitor prices and notify me on Telegram"}'
```

Expected response (example):

```json
{"workflowId":"4640","success":true}
```

3. If Ollama is not running, the router will return an error, but the catalog remains fully browsable.

---

## Ollama / Local AI Configuration

The AI workflow finder uses [Ollama](https://ollama.com) to match natural-language prompts to catalog workflows.

### Setup

1. **Install Ollama**: Follow instructions at [https://ollama.com/download](https://ollama.com/download)

2. **Start Ollama**:

```bash
ollama serve
```

3. **Pull the required model**:

```bash
ollama pull qwen2.5:3b
```

4. **Verify Ollama is reachable**:

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing available models.

### How It Connects

The Next.js API route at `/api/route` reads `OLLAMA_BASE_URL` from the environment (defaults to `http://127.0.0.1:11434`) and sends a `POST` request to Ollama's `/api/generate` endpoint.

> **Note**: The model name `qwen2.5:3b` is currently hardcoded in `apps/web/app/api/route/route.ts` (line 22). To use a different model, edit that file and rebuild.

### Troubleshooting Ollama

| Problem | Solution |
|---|---|
| `Connection refused` on port 11434 | Ensure `ollama serve` is running |
| Model not found | Run `ollama pull qwen2.5:3b` |
| Router returns `null` instead of a workflow ID | The model may not have matched well — browse the catalog manually. This is a known V1 quality limitation |
| Running inside Docker but Ollama on host | The container uses `network_mode: "host"`, so `127.0.0.1:11434` should work. If not, check that Ollama is bound to `0.0.0.0` |

---

## n8n Setup

Automata V1 provides **workflow discovery and download**. You import and run workflows in your own self-hosted n8n instance.

### Running Self-Hosted n8n

**Option 1: Docker (included in docker-compose.yml)**

```bash
docker compose up -d n8n
```

This starts n8n on port **5678** with default credentials:
- Username: `admin`
- Password: `admin`

**Option 2: Standalone** — see [n8n self-hosting docs](https://docs.n8n.io/hosting/)

### Importing a Workflow

1. In Automata, find a workflow and click **⬇️ DOWNLOAD JSON**
2. Open your n8n instance at `http://localhost:5678`
3. Click **Add Workflow** (or open an existing one)
4. Click the **⋮** menu (top-right) → **Import from File**
5. Select the downloaded JSON file
6. Configure any required credentials (shown on the Automata detail page)
7. **Activate** the workflow

### Credential Configuration

Most workflows require third-party credentials (API keys, OAuth tokens). These are configured **inside n8n**, not in Automata:

1. In n8n, go to **Settings → Credentials**
2. Click **Add Credential**
3. Select the type (e.g., `openAiApi`, `telegramApi`, `googleSheetsOAuth2Api`)
4. Enter your API keys/tokens
5. Save and assign the credential to the workflow nodes that need it

> **Important**: Automata does not store or manage your API keys. All credentials live inside your n8n instance.

---

## Workflow Library

### Catalog Location

```
apps/web/public/workflow-library/catalog.json
```

### Workflow JSON Files

```
apps/web/public/workflows/{id}/workflow.json
```

Each workflow JSON is a standard n8n workflow export that can be directly imported into n8n.

### Catalog Schema

Each entry in `catalog.json` has this structure:

```json
{
  "id": "10591",
  "name": "Detect and route cybersecurity threats with SIEM, Slack, email and PagerDuty",
  "description": "Detect and route cybersecurity threats...",
  "category": "cybersecurity",
  "source_url": "https://n8n.io/workflows/10591",
  "source_platform": "n8n",
  "workflow_json": "/workflows/10591/workflow.json",
  "status": "LOCAL READY",
  "local_ai": true,
  "requirements": ["stickyNote", "merge", "slack", "emailSend", "postgres"],
  "credentials": ["slackApi", "smtp", "postgres"],
  "tags": ["cybersecurity"]
}
```

| Field | Description |
|---|---|
| `id` | Unique workflow identifier (matches the n8n template ID) |
| `name` | Human-readable workflow name |
| `description` | Brief description of what the workflow does |
| `category` | Workflow category for browsing |
| `source_url` | Original n8n template URL |
| `source_platform` | Source platform (always `n8n` in V1) |
| `workflow_json` | Relative path to the downloadable JSON file |
| `status` | Readiness level (see below) |
| `local_ai` | Whether the workflow can use local AI models |
| `requirements` | List of n8n node types used by the workflow |
| `credentials` | List of credential types needed to run the workflow |
| `tags` | Searchable tags |

### Status Levels

| Status | Meaning |
|---|---|
| **LOCAL READY** | Workflow can run with minimal configuration |
| **ADAPTABLE** | Workflow works but may need some node adjustments |
| **EXTERNAL / CREDENTIAL REQUIRED** | Workflow requires specific third-party API credentials |

### Curated Workflows (V1)

| ID | Name | Category | Status | Credentials Required |
|---|---|---|---|---|
| 10242 | Personalize resumes & cover letters with AI, GitHub Pages and Google Drive | coding | EXTERNAL / CREDENTIAL REQUIRED | openAiApi, googleSheetsOAuth2Api, googleDriveOAuth2Api, telegramApi, githubApi |
| 10591 | Detect and route cybersecurity threats with SIEM, Slack, email and PagerDuty | cybersecurity | LOCAL READY | slackApi, smtp, postgres |
| 10597 | Monitor cybersecurity compliance and send weekly reports | cybersecurity | LOCAL READY | postgres, smtp |
| 11181 | Automate print-on-demand: design to Shopify with AI, mockups & social promotion | design | ADAPTABLE | (none listed) |
| 14410 | Automate cybersecurity threat analysis with GPT-4o, CVSS scoring and risk routing | cybersecurity | LOCAL READY | openAiApi |
| 14429 | Generate event e-ticket PDFs with QR codes using Google Workspace | documents | LOCAL READY | (none listed) |
| 17010 | Create and approve AI social posts with OpenAI, Telegram and Blotato | social-media | EXTERNAL / CREDENTIAL REQUIRED | openAiApi, telegramApi, blotatoApi, googleSheetsOAuth2Api |
| 19932 | Generate social media posts and images with Groq, OpenAI and Google Drive | social-media | EXTERNAL / CREDENTIAL REQUIRED | groqApi, openAiApi, googleDriveOAuth2Api |
| 20028 | Create and send quote PDFs with OpenAI, Gmail and Google Sheets | documents | EXTERNAL / CREDENTIAL REQUIRED | googleSheetsTriggerOAuth2Api, openAiApi, googleSheetsOAuth2Api, googleDriveOAuth2Api, gmailOAuth2 |
| 2557 | Hacker News to video content | news | EXTERNAL / CREDENTIAL REQUIRED | openAiApi, googleDriveOAuth2Api, httpCustomAuth |
| 2703 | AI agent: Google calendar assistant using OpenAI | assistant | EXTERNAL / CREDENTIAL REQUIRED | openAiApi, googleCalendarOAuth2Api |
| 2768 | The ultimate free AI-powered researcher with Tavily web search & extract | research | EXTERNAL / CREDENTIAL REQUIRED | openAiApi |
| 2883 | Open deep research - AI-powered autonomous research workflow | research | LOCAL READY | openRouterApi, httpHeaderAuth |
| 3291 | Generate SEO-optimized WordPress content with AI powered perplexity research | research | EXTERNAL / CREDENTIAL REQUIRED | wordpressApi, openAiApi, httpHeaderAuth, telegramApi |
| 3586 | AI-powered WhatsApp chatbot for text, voice, images & PDFs with memory | documents | EXTERNAL / CREDENTIAL REQUIRED | whatsAppTriggerApi, httpHeaderAuth, openAiApi, whatsAppApi |
| 3859 | AI customer support assistant · WhatsApp ready · works for any business | assistant | EXTERNAL / CREDENTIAL REQUIRED | openAiApi, whatsAppTriggerApi, whatsAppApi, postgres |
| 4352 | AI-powered multi-social media post automation: Google Trends & Perplexity AI | social-media | EXTERNAL / CREDENTIAL REQUIRED | twitterOAuth2Api, linkedInCommunityManagementOAuth2Api, googleSheetsOAuth2Api, httpHeaderAuth, openAiApi |
| 4640 | Competitor price monitoring with web scraping, Google Sheets & Telegram | monitoring | LOCAL READY | googleSheetsOAuth2Api, telegramApi |
| 10326 | Generate QA test cases from Figma designs to Google Sheets using GPT-4o-mini | design | EXTERNAL / CREDENTIAL REQUIRED | httpHeaderAuth, openAiApi, googleSheetsOAuth2Api |
| 5148 | Local chatbot with retrieval augmented generation (RAG) | artificial-intelligence | LOCAL READY | qdrantApi, ollamaApi |

All workflows are sourced from the [n8n workflow template library](https://n8n.io/workflows/). Each `source_url` links directly to the original template.

---

## Adding / Updating Workflows

### Adding a New Workflow

1. **Download the workflow JSON** from n8n (or export from your n8n instance)

2. **Create the directory and save the file**:

```bash
mkdir -p apps/web/public/workflows/{NEW_ID}
cp your-workflow.json apps/web/public/workflows/{NEW_ID}/workflow.json
```

3. **Add an entry to the catalog**:

Edit `apps/web/public/workflow-library/catalog.json` and add a new object:

```json
{
  "id": "NEW_ID",
  "name": "Your Workflow Name",
  "description": "What it does",
  "category": "your-category",
  "source_url": "https://n8n.io/workflows/NEW_ID",
  "source_platform": "n8n",
  "workflow_json": "/workflows/NEW_ID/workflow.json",
  "status": "EXTERNAL / CREDENTIAL REQUIRED",
  "local_ai": false,
  "requirements": ["node1", "node2"],
  "credentials": ["credentialType1"],
  "tags": ["tag1"]
}
```

4. **Rebuild if running in production mode**:

```bash
npm run build --workspace=@automata/web
```

If using the dev server (`npm run dev`), changes to `public/` are picked up automatically.

### Updating an Existing Workflow

Replace the JSON file at `apps/web/public/workflows/{ID}/workflow.json` and update the catalog entry if metadata changed.

---

## Project Structure

```
AUTOMATA/
├── apps/
│   ├── web/                          # Next.js web app (V1 product)
│   │   ├── app/
│   │   │   ├── api/route/route.ts    # AI router API endpoint
│   │   │   ├── workflow/[id]/page.tsx # Workflow detail page
│   │   │   ├── page.tsx              # Homepage (catalog + prompt)
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── globals.css           # Global styles
│   │   ├── public/
│   │   │   ├── workflow-library/
│   │   │   │   └── catalog.json      # Workflow catalog metadata
│   │   │   └── workflows/
│   │   │       └── {id}/workflow.json # Downloadable workflow JSONs
│   │   └── package.json
│   ├── orchestrator/                  # Frozen V2 infrastructure (not part of V1)
│   └── website/                       # Legacy standalone site
├── packages/                          # Shared packages (V2 infrastructure)
│   ├── ai-provider/
│   ├── n8n-client/
│   ├── news-intelligence/
│   ├── planner/
│   └── workflow-registry/
├── n8n_workflows/                     # Raw workflow JSON archive
├── database/                          # PostgreSQL schema/backups
├── docs/                              # Research and audit documentation
├── docker-compose.yml                 # Docker services configuration
├── Dockerfile                         # Container build for automation-os
├── .env.example                       # Environment variable template
└── package.json                       # Monorepo root (npm workspaces)
```

---

## API

### `POST /api/route`

Finds the best matching workflow for a natural-language prompt using Ollama.

**Request:**

```bash
curl -X POST http://localhost:3000/api/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Monitor competitor prices and alert me on Telegram"}'
```

**Success Response (match found):**

```json
{
  "workflowId": "4640",
  "success": true
}
```

**Success Response (no match):**

```json
{
  "workflowId": null,
  "success": true
}
```

**Error Response (Ollama unavailable):**

```json
{
  "error": "Failed to route prompt",
  "details": "fetch failed"
}
```

**Configuration**: Requires Ollama running at `OLLAMA_BASE_URL` (default: `http://127.0.0.1:11434`) with the `qwen2.5:3b` model.

### Static Assets

| Path | Description |
|---|---|
| `GET /workflow-library/catalog.json` | Full workflow catalog |
| `GET /workflows/{id}/workflow.json` | Individual workflow JSON for download |

---

## Production / Self-Hosting

### Docker Compose (Simplest)

```bash
# Start the web app and its dependencies
docker compose up -d automation-os

# Optionally start n8n
docker compose up -d n8n
```

Services started:

| Service | Container | Port | Purpose |
|---|---|---|---|
| `automation-os` | `automata-os` | 3000 | Automata web app |
| `postgres` | `automata-postgres` | 5434 | PostgreSQL (used by orchestrator/n8n) |
| `n8n` | `automata-n8n` | 5678 | Self-hosted n8n |
| `qdrant` | `automata-qdrant` | 6333 | Vector database (used by RAG workflow) |

> **Note**: The `automation-os` container uses `network_mode: "host"`. It accesses Ollama and other services via `127.0.0.1` on the host machine. Ensure Ollama is running on the host before starting the container.

### Without Docker

```bash
npm ci
npm run build --workspace=@automata/web
npm run start --workspace=@automata/web
```

The app will be available at `http://localhost:3000`.

---

## Security

- **Never commit `.env`** — it is excluded by `.gitignore`. Use `.env.example` as a template.
- **Configure credentials inside n8n** — do not put API keys in workflow JSON metadata or prompts.
- **Protect exposed services** — if running n8n or Ollama beyond `localhost`, use a reverse proxy with authentication (e.g., nginx, Caddy, Traefik).
- **Change default passwords** — the docker-compose uses default PostgreSQL and n8n credentials. Change them for any non-local deployment.
- **Back up your n8n data** — workflow configurations and credentials are stored in n8n's database. Use the provided `database/backup.sh` script or n8n's built-in export.
- **Do not expose the Ollama API publicly** — it has no authentication by default.

---

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| **Website won't start** | Dependencies not installed | Run `npm ci` then `npm run build --workspace=@automata/web` |
| **Port 3000 already in use** | Another process on port 3000 | Kill the process or change the port in `.env` |
| **"Unable to connect" in the UI** | Ollama unreachable from the API route | Verify `ollama serve` is running and `curl http://localhost:11434/api/tags` returns a response |
| **Router returns `null`** | Model didn't match a workflow | This is expected for some prompts. Browse the catalog manually. V1 uses a small model with limited semantic matching |
| **Router returns wrong workflow** | Model selected a poor match | Known V1 limitation. The catalog is small (20 items), and the `qwen2.5:3b` model may not always pick the best one |
| **`model not found` from Ollama** | Model not pulled | Run `ollama pull qwen2.5:3b` |
| **n8n unavailable at port 5678** | n8n not started | Run `docker compose up -d n8n` or start n8n separately |
| **Workflow import errors in n8n** | n8n version mismatch or missing node types | Ensure your n8n version supports the nodes listed in the workflow's `requirements` |
| **Missing credentials after import** | Credentials are not included in workflow JSON | Configure each required credential in n8n's **Settings → Credentials** |
| **Docker build fails** | Node modules cache issue | Run `docker compose build --no-cache automation-os` |

---

## Development

### Dev Server (with hot reload)

```bash
npm run dev --workspace=@automata/web
```

Opens at `http://localhost:3000` with hot reloading.

### Production Build

```bash
npm run build --workspace=@automata/web
```

### Start Production Server

```bash
npm run start --workspace=@automata/web
```

### Lint

```bash
npm run lint --workspace=@automata/web
```

### Build All Workspaces

```bash
npm run build
```

### Run All Tests

```bash
npm run test
```

---

## Deployment

Automata V1 is intended for **self-hosted / local use**. For remote deployment:

1. Deploy to any machine with Node.js 20+ and Ollama
2. Use the provided `docker-compose.yml` for containerized deployment
3. Place behind a reverse proxy (nginx/Caddy) with HTTPS for public access
4. Ensure Ollama is accessible from the Next.js server

Production hosting beyond local/self-hosted is not formally documented in V1. The Docker Compose configuration is the recommended starting point.

---

## Roadmap

- **V1** (current): Curated workflow library + AI router + JSON download + source links
- **V2** (future): Optional deeper n8n integration — headless workflow execution, orchestration, execution tracking
- **Future**: Additional workflow templates, improved routing (deterministic keyword matching), workflow categories expansion

---

## License

No license file is currently included in this repository. All rights reserved by the repository owner unless otherwise specified.

---

## Credits & Sources

All workflow templates in the curated library are sourced from the [n8n workflow template library](https://n8n.io/workflows/). Each workflow's `source_url` in the catalog links to its original n8n template page.

- **n8n** — [https://n8n.io](https://n8n.io) — Open-source workflow automation platform
- **Ollama** — [https://ollama.com](https://ollama.com) — Local LLM inference
- **Next.js** — [https://nextjs.org](https://nextjs.org) — React framework

Automata does not claim ownership of third-party workflow templates. Templates may be subject to their original authors' terms.
