UPDATE credentials_entity SET data = 'U2FsdGVkX1+0UvaiusmCl7itK64IvwgFRxdMu4O8iXwjhEXhixJG8YWej40FwIDKiPth6lXppJkxinF+fG/ZsMoUVDcnrNjto1xKRt6rq9CeO1xOBhPAsnsecYrkVkLo' WHERE name LIKE 'Dummy%';

INSERT INTO installed_packages ("packageName", "installedVersion", "createdAt", "updatedAt") VALUES
('@blotato/n8n-nodes-blotato', '1.0.10', NOW(), NOW()),
('@decodo/n8n-nodes-decodo', '1.10.0', NOW(), NOW()),
('n8n-nodes-browserbase', '1.4.1', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO installed_nodes (name, type, "latestVersion", package) VALUES
('Blotato', '@blotato/n8n-nodes-blotato.blotato', 1, '@blotato/n8n-nodes-blotato'),
('Decodo', '@decodo/n8n-nodes-decodo.decodo', 1, '@decodo/n8n-nodes-decodo')
ON CONFLICT DO NOTHING;
