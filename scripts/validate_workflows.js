const fs = require('fs');
const path = require('path');

const dir = 'n8n_workflows';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let validCount = 0;
let invalidCount = 0;
const invalidDetails = [];

// For duplication check
const hashes = new Map(); // to check exact structural duplicates
let duplicateCount = 0;

for (const file of files) {
    const id = file.replace('wf_', '').replace('.json', '');
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    let wf;
    try {
        wf = JSON.parse(content);
    } catch(e) {
        invalidCount++;
        invalidDetails.push({ file, id, error: 'Invalid JSON', reason: e.message, canFix: false });
        continue;
    }

    if (!wf.nodes || !Array.isArray(wf.nodes)) {
        invalidCount++;
        invalidDetails.push({ file, id, error: 'MISSING_REQUIRED_STRUCTURE', reason: 'No nodes array', canFix: false });
        continue;
    }

    let hasNodeNameError = false;
    for (let i = 0; i < wf.nodes.length; i++) {
        if (!wf.nodes[i].name) {
            hasNodeNameError = true;
            invalidDetails.push({ 
                file, 
                id, 
                error: 'INVALID', 
                reason: `nodes[${i}].name is missing`, 
                canFix: true,
                fixDetail: 'Assign a default name like "Node X" based on type/id.'
            });
            break; // just log it once per file
        }
    }

    if (hasNodeNameError) {
        invalidCount++;
        continue;
    }

    // Check duplicate by taking string of nodes + connections
    const structureHash = JSON.stringify({nodes: wf.nodes.map(n=>n.type), connections: wf.connections});
    if (hashes.has(structureHash)) {
        duplicateCount++;
        invalidCount++;
        invalidDetails.push({ file, id, error: 'DUPLICATE', reason: `Identical structure to ${hashes.get(structureHash)}`, canFix: false });
        continue;
    } else {
        hashes.set(structureHash, file);
    }
    
    validCount++;
}

console.log('VALID:', validCount);
console.log('INVALID:', invalidCount);
console.log('DUPLICATES:', duplicateCount);
console.log('\nINVALID DETAILS:');
console.table(invalidDetails);
fs.writeFileSync('validation_report.json', JSON.stringify({validCount, invalidCount, duplicateCount, invalidDetails}, null, 2));
