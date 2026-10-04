# Cybersecurity News Module

**Status:** Active  
**Version:** 1.0.0  
**Schedule:** Hourly (via n8n)

## Overview

The Cybersecurity News module is the first active Automation OS module. It collects cybersecurity news from 7 authoritative RSS sources, deduplicates and validates items, analyzes each with the local AI model (`qwen2.5:3b`), persists results to PostgreSQL, and optionally sends Telegram alerts.

## Pipeline Stages

```
Trigger (n8n / HTTP POST)
        ↓
1. Collect   — 7 RSS sources in parallel, per-source error isolation
        ↓
2. Deduplicate — ID + normalized URL + normalized title matching
        ↓
3. Validate   — EvidenceValidator → verified / unverified / invalid
        ↓
4. Analyze    — qwen2.5:3b via Ollama (summary, keyPoints, severity, tags, entities, technologies)
        ↓
5. Persist    — PostgresNewsRepository UPSERT, relatedSources merge
        ↓
6. Notify     — Telegram alert if configured and not already sent
```

## Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| `cybersec-cisa` | CISA Cybersecurity Alerts | RSS | ✅ Active |
| `cybersec-thehacker` | The Hacker News | RSS | ✅ Active |
| `cybersec-krebs` | Krebs on Security | RSS | ✅ Active |
| `cybersec-bleeping` | BleepingComputer | RSS | ✅ Active |
| `cybersec-securityweek` | SecurityWeek | RSS | ✅ Active |
| `cybersec-darkreading` | Dark Reading | RSS | ✅ Active |
| `cybersec-schneier` | Schneier on Security | RSS | ✅ Active |

## API

### Trigger execution

```http
POST /api/news/run
Authorization: Bearer <API_AUTH_TOKEN>
```

or via the generic executions endpoint:

```http
POST /api/executions
Authorization: Bearer <API_AUTH_TOKEN>
Content-Type: application/json

{ "module": "cybersecurity-news" }
```

Response:
```json
{
  "execution_id": "exec_lq4x7k8_a3f2b1c9",
  "module": "cybersecurity-news",
  "status": "success",
  "result": {
    "items_collected": 120,
    "items_deduplicated": 98,
    "items_validated": 98,
    "items_analyzed": 97,
    "items_persisted": 97,
    "items_notified": 0
  }
}
```

### Query execution

```http
GET /api/executions/<execution_id>
Authorization: Bearer <API_AUTH_TOKEN>
```

### Verification

```http
GET /api/executions/<execution_id>/verification
Authorization: Bearer <API_AUTH_TOKEN>
```

### Read news feed

```http
GET /api/news?category=cybersecurity&limit=10&page=1
```

## Configuration

All configuration is via environment variables (see `.env.example`):

| Variable | Description | Required |
|---|---|---|
| `API_AUTH_TOKEN` | Authentication token for the API | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OLLAMA_BASE_URL` | Ollama API base URL | Yes |
| `OLLAMA_MODEL` | Model to use (`qwen2.5:3b`) | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Optional |
| `TELEGRAM_CHAT_ID` | Telegram chat/channel ID | Optional (required if token set) |

## Verification Semantics

| Check | Pass | Fail | Skip |
|---|---|---|---|
| `input_schema` | Always | — | — |
| `source_collection` | ≥1 item collected | 0 items | — |
| `deduplication` | Ran successfully | — | — |
| `ai_analysis` | ≥1 item analyzed | All failed | No items to analyze |
| `persistence` | ≥1 item saved | All failed | — |
| `telegram` | ≥1 alert sent | Configured, delivery failed | Not configured |

**Important:** `telegram: skip` means credentials are not set. This is intentional, not an error.

## Telegram Alert Format

```
🔐 CYBERSECURITY ALERT

Title:
<title>

Category:
<category>

Severity:
<severity>

Source:
<source>

Published:
<timestamp>

Summary:
<ai summary>

Why it matters:
<first key point from AI analysis>

Read:
<url>

Execution:
<execution_id>
```
