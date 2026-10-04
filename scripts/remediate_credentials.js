const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({
  user: 'automata',
  host: 'automata-postgres',
  database: 'automata',
  password: 'automata_password',
  port: 5432,
});

async function run() {
  await client.connect();
  
  // Get all existing credentials
  const credsRes = await client.query('SELECT id, name, type FROM credentials_entity;');
  const credsByType = {};
  const allCredIds = new Set();
  
  for (const row of credsRes.rows) {
    if (!credsByType[row.type]) credsByType[row.type] = [];
    credsByType[row.type].push(row);
    allCredIds.add(row.id);
  }
  
  // Get all workflows
  const workflowsRes = await client.query('SELECT id, nodes FROM workflow_entity;');
  
  let updatedCount = 0;
  
  for (const row of workflowsRes.rows) {
    const nodes = row.nodes;
    if (!nodes || !Array.isArray(nodes)) continue;
    
    let changed = false;
    
    for (const node of nodes) {
      if (node.credentials) {
        for (const [key, cred] of Object.entries(node.credentials)) {
          if (!cred.id) continue;
          
          if (!allCredIds.has(cred.id)) {
            changed = true;
            console.log(`Workflow ${row.id}: Node ${node.name} missing credential ${cred.id} for type ${key}`);
            
            if (credsByType[key] && credsByType[key].length > 0) {
              const replacement = credsByType[key][0];
              cred.id = replacement.id;
              cred.name = replacement.name;
              console.log(`  -> Replaced with existing ${replacement.id} (${replacement.name})`);
            } else {
              // Create a dummy credential
              const newId = crypto.randomBytes(8).toString('hex');
              const newName = `Dummy ${key} Credential`;
              
              await client.query(
                `INSERT INTO credentials_entity (id, name, type, data, "createdAt", "updatedAt") 
                 VALUES ($1, $2, $3, '{}', NOW(), NOW());`,
                [newId, newName, key]
              );
              
              const newCred = { id: newId, name: newName, type: key };
              credsByType[key] = [newCred];
              allCredIds.add(newId);
              
              cred.id = newId;
              cred.name = newName;
              console.log(`  -> Created new dummy credential ${newId} (${newName})`);
            }
          }
        }
      }
    }
    
    if (changed) {
      await client.query('UPDATE workflow_entity SET nodes = $1 WHERE id = $2', [JSON.stringify(nodes), row.id]);
      updatedCount++;
    }
  }
  
  console.log(`Updated ${updatedCount} workflows with missing credentials.`);
  
  await client.end();
}

run().catch(console.error);
