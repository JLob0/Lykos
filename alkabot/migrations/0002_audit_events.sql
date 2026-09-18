CREATE TABLE IF NOT EXISTS audit_events (
  audit_id VARCHAR(64) PRIMARY KEY,
  correlation_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  actor_type VARCHAR(32) NULL,
  actor_id VARCHAR(64) NULL,
  target_type VARCHAR(64) NULL,
  target_id VARCHAR(128) NULL,
  source VARCHAR(128) NOT NULL,
  severity VARCHAR(32) NOT NULL DEFAULT 'INFO',
  metadata_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_audit_correlation (correlation_id),
  INDEX idx_audit_event_type_created (event_type, created_at),
  INDEX idx_audit_actor (actor_type, actor_id)
);

