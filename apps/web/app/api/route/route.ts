import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Load catalog
    const catalogPath = path.join(process.cwd(), 'public', 'workflow-library', 'catalog.json');
    const catalogData = fs.readFileSync(catalogPath, 'utf8');
    const catalog = JSON.parse(catalogData);

    const catalogStr = catalog.map((wf: any) => `ID: ${wf.id} - Name: ${wf.name} - Category: ${wf.category} - Description: ${wf.description}`).join('\n');

    const ollamaPayload = {
      model: 'qwen2.5:3b',
      prompt: `You are an AI router. Given the user's prompt, find the MOST RELEVANT workflow ID from the catalog.
Even if it's not a perfect match, you MUST output the single best workflow ID from the catalog.
Only output the exact workflow ID (digits only). Do not explain.

Catalog:
${catalogStr}

User Prompt:
${prompt}

Workflow ID:`,
      stream: false,
      options: {
        temperature: 0.1
      }
    };

    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

    const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      cache: 'no-store'
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama returned ${ollamaRes.status}`);
    }

    const aiData = await ollamaRes.json();
    const responseText = aiData.response?.trim();

    console.log("Ollama returned:", responseText);
    if (responseText && responseText !== 'NONE' && catalog.find((c: any) => c.id === responseText)) {
      return NextResponse.json({ workflowId: responseText, success: true });
    } else {
      return NextResponse.json({ workflowId: null, success: true });
    }

  } catch (error: any) {
    console.error("Router error:", error);
    return NextResponse.json({ error: "Failed to route prompt", details: error.message }, { status: 500 });
  }
}
