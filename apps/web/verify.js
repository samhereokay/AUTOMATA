const fs = require('fs');
const catalog = JSON.parse(fs.readFileSync('apps/web/public/workflow-library/catalog.json', 'utf8'));

let allGood = true;

console.log('| ID | Name | Source URL | JSON exists | Status |');
console.log('|---|---|---|---|---|');

for (const wf of catalog) {
    let jsonExists = 'No';
    let status = 'OK';
    
    // Check if JSON exists and is valid
    const jsonPath = `apps/web/public/workflows/${wf.id}/workflow.json`;
    if (fs.existsSync(jsonPath)) {
        try {
            JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            jsonExists = 'Yes (Valid)';
        } catch (e) {
            jsonExists = 'Yes (Invalid JSON)';
            status = 'Error';
        }
    } else {
        status = 'Error';
    }
    
    // Check if source URL matches n8n template format: https://n8n.io/workflows/ID
    const expectedUrl = `https://n8n.io/workflows/${wf.id}`;
    if (!wf.source_url || !wf.source_url.startsWith(expectedUrl)) {
        status = 'Warning: URL mismatch';
    }
    
    console.log(`| ${wf.id} | ${wf.name.replace(/\|/g, '')} | ${wf.source_url} | ${jsonExists} | ${status} |`);
    
    if (status !== 'OK') {
        allGood = false;
    }
}

console.log('\nAll good:', allGood);
