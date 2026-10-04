import json
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(
    dbname="automata",
    user="automata",
    password="automata_password",
    host="127.0.0.1",
    port=5434
)
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute("SELECT id, nodes FROM workflow_entity")
rows = cur.fetchall()

for row in rows:
    nodes = row['nodes']
    modified = False
    for node in nodes:
        if node.get('type') == 'n8n-nodes-base.noOp':
            if 'webhookId' in node:
                del node['webhookId']
                modified = True
            if 'parameters' in node and 'path' in node['parameters']:
                del node['parameters']['path']
                modified = True
                
    if modified:
        cur.execute(
            "UPDATE workflow_entity SET nodes = %s WHERE id = %s",
            (json.dumps(nodes), row['id'])
        )

conn.commit()
cur.close()
conn.close()
print("Cleaned up noOp nodes!")
