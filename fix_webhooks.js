const fs = require('fs');
const { execSync } = require('child_process');

function fix(id) {
  const q1 = `docker exec -e PGPASSWORD=automata_password automata-postgres psql -U automata -d automata -t -A -c "SELECT nodes FROM workflow_entity WHERE id = '${id}';"`;
  let nodesJson = execSync(q1).toString().trim();
  if (!nodesJson) return;
  const nodes = JSON.parse(nodesJson);
  let changed = false;
  for (const n of nodes) {
    if (n.type === 'n8n-nodes-base.webhook' && n.name === 'Automata Webhook') {
      n.parameters.responseMode = 'lastNode';
      n.parameters.responseData = 'allEntries';
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync('/tmp/fixed.json', JSON.stringify(nodes));
    const q2 = `docker exec -i -e PGPASSWORD=automata_password automata-postgres psql -U automata -d automata -c "UPDATE workflow_entity SET nodes = '$(cat /tmp/fixed.json | sed "s/'/''/g")' WHERE id = '${id}';"`;
    execSync(q2);
    console.log('Fixed ' + id);
  }
}

fix('PG84Tipt74DfpUvh');
fix('1dSFJgL340NlOBkh');
