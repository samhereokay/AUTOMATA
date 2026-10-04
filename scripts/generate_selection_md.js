const fs = require('fs');
const selected = JSON.parse(fs.readFileSync('workflow-selection.json', 'utf8'));

let md = '# Workflow Selection\n\n';
md += '| Category | Name | n8n Community URL | Local JSON | Required Services | Status |\n';
md += '|----------|------|-------------------|------------|-------------------|--------|\n';

for (const wf of selected) {
    const services = (wf.required_services || []).join(', ');
    const url = wf.source_url || `https://n8n.io/workflows/${wf.workflow_id}`;
    const localJson = `wf_${wf.workflow_id}.json`;
    md += `| ${wf.category} | ${wf.title} | ${url} | ${localJson} | ${services} | SELECTED |\n`;
}

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/WORKFLOW_SELECTION.md', md);
console.log('Generated docs/WORKFLOW_SELECTION.md');
