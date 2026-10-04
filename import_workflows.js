const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

async function importWorkflows() {
    const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf-8'));
    const library = [];
    
    let fetchedCount = 0;
    let failedCount = 0;
    let secReviewCount = 0;
    
    const importDir = path.join(__dirname, 'n8n_workflows');
    if (fs.existsSync(importDir)) fs.rmSync(importDir, { recursive: true, force: true });
    fs.mkdirSync(importDir);
    
    for (const wf of selected) {
        console.log(`Fetching ${wf.workflow_id}: ${wf.title}`);
        let rawWorkflow = null;
        let status = 'IMPORTED';
        
        try {
            const url = `https://api.n8n.io/api/templates/workflows/${wf.workflow_id}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch workflow ${wf.workflow_id}, status: ${res.status}`);
            const data = await res.json();
            
            if (data && data.workflow && data.workflow.workflow) {
                rawWorkflow = data.workflow.workflow;
            } else {
                throw new Error("Invalid workflow JSON structure");
            }
        } catch (e) {
            console.error(`Failed to get raw JSON for ${wf.workflow_id}:`, e.message);
            status = 'IMPORT_UNAVAILABLE';
            failedCount++;
        }
        
        if (rawWorkflow) {
            const jsonStr = JSON.stringify(rawWorkflow);
            const isSuspicious = /api[_\-]?key|bearer\s+[A-Za-z0-9]|password|secret/i.test(jsonStr);
            if (isSuspicious) {
                status = 'SECURITY_REVIEW_REQUIRED';
                secReviewCount++;
            }
            
            rawWorkflow.active = false;
            if (!rawWorkflow.tags) rawWorkflow.tags = [];
            const tagId = `[AUTOMATA][${wf.category.toUpperCase().slice(0, 10)}]`;
            
            // Safe tags array
            if (!Array.isArray(rawWorkflow.tags)) rawWorkflow.tags = [];
            
            // Enforce naming convention as requested
            rawWorkflow.name = `${tagId} ${wf.title}`.substring(0, 100);
            
            const tmpFile = path.join(importDir, `wf_${wf.workflow_id}.json`);
            fs.writeFileSync(tmpFile, JSON.stringify(rawWorkflow));
            fetchedCount++;
        }
        
        library.push({
            workflow_id: wf.workflow_id,
            name: wf.title,
            category: wf.category,
            source_url: wf.source_url,
            local_n8n_id: "UNKNOWN", 
            status: status,
            required_credentials: [], // we could parse nodes if we want
            required_services: wf.required_services,
            free_or_paid: wf.free_or_paid,
            active: false,
            tested: false,
            notes: ""
        });
    }
    
    // Perform bulk import
    if (fetchedCount > 0) {
        console.log(`Starting bulk import of ${fetchedCount} workflows...`);
        try {
            execSync(`docker cp ${importDir} automata-n8n:/tmp/n8n_workflows`);
            const out = execSync(`docker exec automata-n8n n8n import:workflow --separate --input=/tmp/n8n_workflows`).toString();
            console.log("Import Output:", out);
            try { execSync(`docker exec automata-n8n rm -rf /tmp/n8n_workflows`); } catch(e){}
        } catch (e) {
            console.error(`Bulk import failed:`, e.message);
        }
    }
    
    fs.writeFileSync('workflow-library.json', JSON.stringify(library, null, 2));
    
    let md = `# n8n Automata Workflow Library\n\n`;
    md += `**Imported**: ${fetchedCount}\n`;
    md += `**Import Failed**: ${failedCount}\n`;
    md += `**Security Review Required**: ${secReviewCount}\n\n`;
    
    for (const item of library) {
        md += `### ${item.name}\n`;
        md += `- **Original ID**: ${item.workflow_id}\n`;
        md += `- **Local ID**: ${item.local_n8n_id}\n`;
        md += `- **Status**: ${item.status}\n`;
        md += `- **Source URL**: [${item.source_url}](${item.source_url})\n\n`;
    }
    
    fs.mkdirSync('docs', {recursive:true});
    fs.writeFileSync('docs/WORKFLOW_LIBRARY.md', md);
    console.log("Process complete.");
}

importWorkflows();
