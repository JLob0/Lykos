CREATE TABLE IF NOT EXISTS discord_accounts (
  discord_user_id VARCHAR(32) PRIMARY KEY,
  username VARCHAR(64) NULL,
  global_name VARCHAR(128) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS minecraft_accounts (
  minecraft_uuid CHAR(36) PRIMARY KEY,
  last_known_name VARCHAR(16) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS linked_identities (
  identity_id VARCHAR(96) PRIMARY KEY,
  discord_user_id VARCHAR(32) NOT NULL,
  minecraft_uuid CHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL,
  source VARCHAR(64) NOT NULL,
  linked_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  unlinked_at TIMESTAMP(3) NULL,
  active_discord_user_id VARCHAR(32) GENERATED ALWAYS AS (
    CASE WHEN status = 'ACTIVE' THEN discord_user_id ELSE NULL END
  ) STORED,
  active_minecraft_uuid CHAR(36) GENERATED ALWAYS AS (
    CASE WHEN status = 'ACTIVE' THEN minecraft_uuid ELSE NULL END
  ) STORED,
  UNIQUE KEY uq_linked_identities_active_discord (active_discord_user_id),
  UNIQUE KEY uq_linked_identities_active_minecraft (active_minecraft_uuid),
  INDEX idx_linked_identities_discord (discord_user_id),
  INDEX idx_linked_identities_minecraft (minecraft_uuid),
  INDEX idx_linked_identities_status (status),
  CONSTRAINT fk_linked_identities_discord FOREIGN KEY (discord_user_id)
    REFERENCES discord_accounts (discord_user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_linked_identities_minecraft FOREIGN KEY (minecraft_uuid)
    REFERENCES minecraft_accounts (minecraft_uuid)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS link_codes (
  code_id VARCHAR(96) PRIMARY KEY,
  code_hash CHAR(64) NOT NULL UNIQUE,
  minecraft_uuid CHAR(36) NOT NULL,
  minecraft_name VARCHAR(16) NULL,
  requested_by_server_id VARCHAR(96) NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  consumed_at TIMESTAMP(3) NULL,
  consumed_by_discord_id VARCHAR(32) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_link_codes_minecraft_created (minecraft_uuid, created_at),
  INDEX idx_link_codes_expires_at (expires_at),
  INDEX idx_link_codes_consumed_by_discord (consumed_by_discord_id)
);
