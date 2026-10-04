import json
import subprocess

def run_sql(query):
    return subprocess.check_output([
        "docker", "exec", "-e", "PGPASSWORD=automata_password", "automata-postgres",
        "psql", "-U", "automata", "-d", "automata", "-t", "-A", "-c", query
    ]).decode('utf-8').strip()

# Fetch all workflows
output = run_sql("SELECT id, nodes FROM workflow_entity;")
rows = output.strip().split('\n')
for row in rows:
    if not row: continue
    parts = row.split('|', 1)
    if len(parts) != 2: continue
    w_id, nodes_json = parts
    try:
        nodes = json.loads(nodes_json)
    except:
        continue
    
    changed = False
    new_nodes = []
    for n in nodes:
        if n.get('type') == 'n8n-nodes-base.formTrigger':
            n['type'] = 'n8n-nodes-base.noOp'
            changed = True
        
        new_nodes.append(n)
        
    if changed:
        escaped_json = json.dumps(new_nodes).replace("'", "''")
        update_query = f"UPDATE workflow_entity SET nodes = '{escaped_json}' WHERE id = '{w_id}';"
        run_sql(update_query)

print("Fixed form triggers")
