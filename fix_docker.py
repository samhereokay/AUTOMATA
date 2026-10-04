with open('docker-compose.yml', 'r') as f:
    content = f.read()

if 'N8N_CUSTOM_EXTENSIONS' not in content:
    content = content.replace('      - NODE_ENV=production', '      - NODE_ENV=production\n      - N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom')

with open('docker-compose.yml', 'w') as f:
    f.write(content)
