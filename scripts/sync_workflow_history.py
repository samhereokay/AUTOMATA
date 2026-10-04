import subprocess
import json

def run_sql(query):
    result = subprocess.run([
        "docker", "exec", "-e", "PGPASSWORD=automata_password", "automata-postgres",
        "psql", "-U", "automata", "-d", "automata", "-t", "-A", "-c", query
    ], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"SQL Error: {result.stderr}")
    return result.stdout.strip().split('\n')

def sync_nodes():
    rows = run_sql("SELECT id, nodes FROM workflow_entity")
    updated = 0
    for row in rows:
        if not row: continue
        parts = row.split('|', 1)
        if len(parts) != 2: continue
        w_id = parts[0]
        nodes_str = parts[1]
        
        # We need to escape single quotes for SQL
        escaped_nodes = nodes_str.replace("'", "''")
        update_query = f"UPDATE workflow_history SET nodes = '{escaped_nodes}' WHERE \"workflowId\" = '{w_id}'"
        subprocess.run([
            "docker", "exec", "-e", "PGPASSWORD=automata_password", "automata-postgres",
            "psql", "-U", "automata", "-d", "automata", "-c", update_query
        ])
        updated += 1
    
    print(f"Updated {updated} workflow_history records to match workflow_entity nodes.")

if __name__ == "__main__":
    sync_nodes()
