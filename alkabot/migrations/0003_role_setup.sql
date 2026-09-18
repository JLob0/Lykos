CREATE TABLE IF NOT EXISTS discord_role_blueprints (
  role_key VARCHAR(191) PRIMARY KEY,
  mode VARCHAR(32) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  color_hex VARCHAR(16) NOT NULL,
  hoist BOOLEAN NOT NULL DEFAULT FALSE,
  mentionable BOOLEAN NOT NULL DEFAULT FALSE,
  role_group VARCHAR(64) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  discord_role_id VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL,
  imported_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_at TIMESTAMP(3) NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_discord_role_blueprints_mode (mode),
  INDEX idx_discord_role_blueprints_discord_role_id (discord_role_id),
  INDEX idx_discord_role_blueprints_status (status)
);

CREATE TABLE IF NOT EXISTS setup_role_apply_runs (
  run_id VARCHAR(96) PRIMARY KEY,
  correlation_id VARCHAR(96) NOT NULL,
  mode VARCHAR(32) NOT NULL,
  actor_type VARCHAR(64) NOT NULL,
  actor_id VARCHAR(191) NOT NULL,
  status VARCHAR(32) NOT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_setup_role_apply_runs_correlation_id (correlation_id),
  INDEX idx_setup_role_apply_runs_actor (actor_type, actor_id),
  INDEX idx_setup_role_apply_runs_created_at (created_at)
);
