const fs = require('fs');

const missing = [
    { cat: 'coding', term: 'github' },
    { cat: 'social-media', term: 'social' },
    { cat: 'documents', term: 'pdf' },
    { cat: 'artificial-intelligence', term: 'rag' },
    { cat: 'assistant', term: 'assistant' }
];

async function run() {
    let allWorkflows = JSON.parse(fs.readFileSync('/home/sam/.gemini/antigravity/brain/1f1c4aa5-92e9-4ae4-9507-8823bdb7813e/workflow-discovery.json'));
    
    for (const {cat, term} of missing) {
        console.log(`Fetching missing category: ${cat} using term: ${term}...`);
        try {
            const url = `https://api.n8n.io/api/templates/workflows?limit=15&search=${term}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`Failed to fetch ${cat}: ${res.status}`);
                continue;
            }
            const data = await res.json();
            const workflows = data.workflows || [];
            
            for (const wf of workflows) {
                let required_services = [];
                if (wf.nodes) {
                    required_services = wf.nodes.map(n => n.type).filter(Boolean);
                }
                allWorkflows.push({
                    workflow_id: String(wf.id),
                    title: wf.name,
                    source_url: `https://n8n.io/workflows/${wf.id}`,
                    category: cat,
                    description: wf.description || "N/A",
                    required_services: [...new Set(required_services)],
                    required_credentials: [],
                    free_or_paid: "free",
                    duplicate_group: null,
                    recommended_status: "PENDING_SELECTION"
                });
            }
        } catch (e) {
            console.error(`Error fetching ${cat}:`, e.message);
        }
    }
    
    // De-duplicate by ID
    const unique = [];
    const seen = new Set();
    const catCounts = {};
    for (const w of allWorkflows) {
        if (!seen.has(w.workflow_id)) {
            seen.add(w.workflow_id);
            unique.push(w);
            catCounts[w.category] = (catCounts[w.category] || 0) + 1;
        }
    }

    fs.writeFileSync('/home/sam/.gemini/antigravity/brain/1f1c4aa5-92e9-4ae4-9507-8823bdb7813e/workflow-discovery.json', JSON.stringify(unique, null, 2));
    
    // Generate markdown report
    let md = `# n8n Workflow Discovery Report\n\n`;
    md += `**Total Discovered (Unique):** ${unique.length}\n\n`;
    md += `## Category Breakdown\n\n`;
    for (const [c, count] of Object.entries(catCounts)) {
        md += `- **${c}**: ${count}\n`;
    }
    md += `\n## Workflows\n\n`;
    
    // Just list 10 per category for the report to not make it huge
    for (const [c, count] of Object.entries(catCounts)) {
        md += `### Category: ${c}\n\n`;
        const subset = unique.filter(w => w.category === c).slice(0, 15);
        for (const w of subset) {
            md += `#### ${w.title}\n`;
            md += `- **ID**: ${w.workflow_id}\n`;
            md += `- **Source URL**: [${w.source_url}](${w.source_url})\n`;
            md += `- **Services**: ${w.required_services.join(', ') || 'None listed'}\n\n`;
        }
    }
    
    fs.writeFileSync('/home/sam/.gemini/antigravity/brain/1f1c4aa5-92e9-4ae4-9507-8823bdb7813e/docs_WORKFLOW_DISCOVERY.md', md);
    console.log("Done fixing JSON and MD.");
}

run();
