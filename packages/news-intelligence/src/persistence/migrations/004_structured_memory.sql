CREATE TABLE IF NOT EXISTS structured_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope VARCHAR(50) NOT NULL,
    scope_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (scope, scope_id, type, key)
);

CREATE INDEX idx_structured_memory_scope ON structured_memory(scope, scope_id);
