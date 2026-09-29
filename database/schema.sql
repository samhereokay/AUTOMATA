-- AUTOMATA Database Schema

CREATE TABLE workflows (
    id VARCHAR(255) PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    input_schema JSONB,
    output_schema JSONB,
    n8n_workflow_id VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_capabilities (
    workflow_id VARCHAR(255) REFERENCES workflows(id) ON DELETE CASCADE,
    capability VARCHAR(255) NOT NULL,
    PRIMARY KEY (workflow_id, capability)
);

CREATE TABLE workflow_connections (
    workflow_id VARCHAR(255) REFERENCES workflows(id) ON DELETE CASCADE,
    connection_type VARCHAR(255) NOT NULL,
    PRIMARY KEY (workflow_id, connection_type)
);

CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL, -- For future multi-tenant support
    provider VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credentials_encrypted TEXT NOT NULL, -- Encrypted at application layer
    n8n_credential_id VARCHAR(255), -- ID of the credential in n8n
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    status VARCHAR(50) NOT NULL, -- planned, validated, awaiting_approval, queued, running, completed, failed, cancelled
    execution_plan JSONB,
    n8n_execution_id VARCHAR(255),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    level VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
