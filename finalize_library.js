const fs = require('fs');
const { execSync } = require('child_process');

function run() {
    console.log("Exporting all workflows from n8n...");
    execSync('docker exec automata-n8n n8n export:workflow --all --output=/tmp/exported_all.json');
    execSync('docker cp automata-n8n:/tmp/exported_all.json ./exported_all.json');
    
    const dbWorkflows = JSON.parse(fs.readFileSync('exported_all.json', 'utf8'));
    const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));
    
    const library = [];
    let importedCount = 0;
    let failedCount = 0;
    
    for (const wf of selected) {
        // Find matching workflow in DB
        const tag = `[AUTOMATA][${wf.category.toUpperCase().slice(0, 10)}]`;
        const expectedNamePrefix = `${tag} ${wf.title}`.substring(0, 100);
        
        const matched = dbWorkflows.find(dbw => dbw.name && dbw.name === expectedNamePrefix);
        let status = 'FAILED';
        let localId = 'UNKNOWN';
        
        if (matched) {
            status = 'IMPORTED';
            localId = matched.id;
            importedCount++;
        } else {
            failedCount++;
        }
        
        const jsonStr = JSON.stringify(wf);
        if (/api[_\-]?key|bearer\s+[A-Za-z0-9]|password|secret/i.test(jsonStr) && status === 'IMPORTED') {
            status = 'SECURITY_REVIEW_REQUIRED';
        }
        
        library.push({
            workflow_id: wf.workflow_id,
            name: wf.title,
            category: wf.category,
            source_url: wf.source_url,
            local_n8n_id: localId,
            status: status,
            required_credentials: [],
            required_services: wf.required_services,
            free_or_paid: wf.free_or_paid,
            active: false,
            tested: false,
            notes: ""
        });
    }
    
    fs.writeFileSync('workflow-library.json', JSON.stringify(library, null, 2));
    
    let md = `# n8n Automata Workflow Library\n\n`;
    md += `**Target Selected**: ${selected.length}\n`;
    md += `**Successfully Imported**: ${importedCount}\n`;
    md += `**Failed/Skipped**: ${failedCount}\n\n`;
    
    // Group by category
    const grouped = {};
    for (const item of library) {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
    }
    
    for (const [cat, items] of Object.entries(grouped)) {
        md += `## Category: ${cat}\n\n`;
        for (const item of items) {
            md += `### ${item.name}\n`;
            md += `- **Original ID**: ${item.workflow_id}\n`;
            md += `- **Local ID**: ${item.local_n8n_id}\n`;
            md += `- **Status**: ${item.status}\n`;
            md += `- **Source URL**: [${item.source_url}](${item.source_url})\n\n`;
        }
    }
    
    fs.writeFileSync('docs/WORKFLOW_LIBRARY.md', md);
    console.log("Final library report generated.");
}

run();
