import json
import subprocess
import uuid

def run_psql(query):
    cmd = [
        "docker", "exec", "-e", "PGPASSWORD=automata_password", "automata-postgres",
        "psql", "-U", "automata", "-d", "automata", "-t", "-A", "-c", query
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise Exception(f"Query failed: {res.stderr}")
    return res.stdout.strip()

print("Fetching credentials...")
creds_raw = run_psql("SELECT id, type, name FROM credentials_entity;")
creds_by_type = {}
all_ids = set()

for line in creds_raw.split('\n'):
    if not line: continue
    parts = line.split('|')
    if len(parts) >= 3:
        cid, ctype, cname = parts[0], parts[1], parts[2]
        if ctype not in creds_by_type:
            creds_by_type[ctype] = []
        creds_by_type[ctype].append({"id": cid, "name": cname})
        all_ids.add(cid)

print("Fetching workflows...")
workflows_raw = run_psql("SELECT id, nodes FROM workflow_entity;")
updates = []
inserts = []

for line in workflows_raw.split('\n'):
    if not line: continue
    parts = line.split('|', 1)
    if len(parts) != 2: continue
    wid, nodes_str = parts[0], parts[1]
    
    try:
        nodes = json.loads(nodes_str)
    except json.JSONDecodeError:
        continue
        
    changed = False
    
    for node in nodes:
        if "credentials" in node:
            for ctype, cred in list(node["credentials"].items()):
                cid = cred.get("id")
                if not cid: continue
                
                if cid not in all_ids:
                    print(f"Workflow {wid} node {node['name']} missing credential {cid} for {ctype}")
                    changed = True
                    
                    if ctype in creds_by_type and creds_by_type[ctype]:
                        replacement = creds_by_type[ctype][0]
                        cred["id"] = replacement["id"]
                        cred["name"] = replacement["name"]
                        print(f"  -> Replaced with {replacement['id']}")
                    else:
                        new_id = uuid.uuid4().hex[:16]
                        new_name = f"Dummy {ctype}"
                        inserts.append(f"INSERT INTO credentials_entity (id, name, type, data, \"createdAt\", \"updatedAt\") VALUES ('{new_id}', '{new_name}', '{ctype}', '{{}}', NOW(), NOW());")
                        
                        new_cred = {"id": new_id, "name": new_name}
                        creds_by_type[ctype] = [new_cred]
                        all_ids.add(new_id)
                        
                        cred["id"] = new_id
                        cred["name"] = new_name
                        print(f"  -> Created dummy {new_id}")
    
    if changed:
        nodes_escaped = json.dumps(nodes).replace("'", "''")
        updates.append(f"UPDATE workflow_entity SET nodes = '{nodes_escaped}' WHERE id = '{wid}';")

if inserts or updates:
    with open("remediate.sql", "w") as f:
        f.write("\n".join(inserts) + "\n")
        f.write("\n".join(updates) + "\n")
    print("Executing updates...")
    subprocess.run(["docker", "cp", "remediate.sql", "automata-postgres:/tmp/remediate.sql"], check=True)
    run_psql("\\i /tmp/remediate.sql")
else:
    print("No updates needed.")
