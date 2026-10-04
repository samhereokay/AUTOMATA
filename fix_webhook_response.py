import json
import psycopg2

def run():
    conn = psycopg2.connect("dbname=automata user=automata password=automata_password host=localhost")
    cur = conn.cursor()
    
    cur.execute("SELECT id, nodes FROM workflow_entity WHERE id IN ('1dSFJgL340NlOBkh', 'PG84Tipt74DfpUvh');")
    rows = cur.fetchall()
    
    for row in rows:
        wid = row[0]
        nodes = row[1]
        
        for n in nodes:
            if n.get('type') == 'n8n-nodes-base.webhook' and n.get('name') == 'Automata Webhook':
                n['parameters']['responseMode'] = 'lastNode'
                
        cur.execute("UPDATE workflow_entity SET nodes = %s WHERE id = %s", (json.dumps(nodes), wid))
        print(f"Updated {wid}")
        
    conn.commit()
    cur.close()
    conn.close()

run()
