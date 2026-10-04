-- Migration 003: Execution tracking for Automation OS
-- Each pipeline run gets a unique execution record with full lifecycle state.

CREATE TABLE IF NOT EXISTS executions (
  id           TEXT PRIMARY KEY,                  -- exec_<ulid>
  module       TEXT NOT NULL,                     -- e.g. 'cybersecurity-news'
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending|running|success|failure|partial
  started_at   TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  input        JSONB,                             -- sanitized input (no secrets)
  result       JSONB,                             -- PipelineResult snapshot
  error        TEXT,                              -- top-level error message if failed
  verification JSONB,                             -- structured verification checks
  notifications JSONB                             -- notification delivery status
);

CREATE INDEX IF NOT EXISTS idx_executions_module      ON executions(module);
CREATE INDEX IF NOT EXISTS idx_executions_status      ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started_at  ON executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_module_started ON executions(module, started_at DESC);
