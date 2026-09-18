CREATE TABLE IF NOT EXISTS server_nodes (
  server_id VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  environment VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  bridge_version VARCHAR(64) NULL,
  paper_version VARCHAR(128) NULL,
  java_version VARCHAR(64) NULL,
  last_heartbeat_at TIMESTAMP(3) NULL,
  capabilities_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

