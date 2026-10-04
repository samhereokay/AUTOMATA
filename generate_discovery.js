const fs = require('fs');

const categories = [
    'news',
    'research',
    'cybersecurity',
    'developer-tools', // Coding/Github
    'social-media',
    'design',
    'video',
    'email',
    'documents', // Documents/PDF
    'monitoring',
    'artificial-intelligence', // AI/RAG
    'assistant'
];

async function run() {
    const allWorkflows = [];
    const reportStats = {
        total_discovered: 0,
        categories: {}
    };

    for (const cat of categories) {
        console.log(`Fetching category: ${cat}...`);
        try {
            // Using a limit of 15 to allow for duplicates/filtering
            const url = `https://api.n8n.io/api/templates/workflows?limit=15&search=${cat}`;
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`Failed to fetch ${cat}: ${res.status}`);
                continue;
            }
            const data = await res.json();
            const workflows = data.workflows || [];
            
            reportStats.categories[cat] = workflows.length;
            reportStats.total_discovered += workflows.length;
            
            for (const wf of workflows) {
                // Determine some basic node requirements
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
                    required_credentials: [], // Hard to determine without full JSON, but we can guess later
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
    for (const w of allWorkflows) {
        if (!seen.has(w.workflow_id)) {
            seen.add(w.workflow_id);
            unique.push(w);
        }
    }

    fs.writeFileSync('/home/sam/.gemini/antigravity/brain/1f1c4aa5-92e9-4ae4-9507-8823bdb7813e/workflow-discovery.json', JSON.stringify(unique, null, 2));
    
    // Generate markdown report
    let md = `# n8n Workflow Discovery Report\n\n`;
    md += `**Total Discovered (Unique):** ${unique.length}\n\n`;
    md += `## Category Breakdown\n\n`;
    for (const [c, count] of Object.entries(reportStats.categories)) {
        md += `- **${c}**: ${count}\n`;
    }
    md += `\n## Workflows\n\n`;
    
    for (const w of unique) {
        md += `### ${w.title}\n`;
        md += `- **ID**: ${w.workflow_id}\n`;
        md += `- **Category**: ${w.category}\n`;
        md += `- **Source URL**: [${w.source_url}](${w.source_url})\n`;
        md += `- **Services**: ${w.required_services.join(', ') || 'None listed'}\n\n`;
    }
    
    fs.writeFileSync('/home/sam/.gemini/antigravity/brain/1f1c4aa5-92e9-4ae4-9507-8823bdb7813e/docs_WORKFLOW_DISCOVERY.md', md);
    console.log("Done. Saved JSON and MD.");
}

run();
