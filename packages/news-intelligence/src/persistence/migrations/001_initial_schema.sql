CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  metadata JSONB,
  
  validation_status TEXT,
  validation_errors JSONB,
  validation_warnings JSONB,
  
  analysis_summary TEXT,
  analysis_key_points JSONB,
  analysis_entities JSONB,
  analysis_technologies JSONB,
  analysis_tags JSONB,
  analysis_severity TEXT
);

CREATE TABLE IF NOT EXISTS related_sources (
  news_item_id TEXT REFERENCES news_items(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  PRIMARY KEY (news_item_id, source)
);

CREATE INDEX IF NOT EXISTS idx_news_items_url ON news_items(url);
CREATE INDEX IF NOT EXISTS idx_news_items_title ON news_items(title);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  channel TEXT NOT NULL,
  news_item_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (channel, news_item_id)
);
