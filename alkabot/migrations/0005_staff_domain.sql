CREATE TABLE IF NOT EXISTS staff_departments (
  department_key VARCHAR(96) PRIMARY KEY,
  display_name VARCHAR(96) NOT NULL,
  description VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS staff_positions (
  position_key VARCHAR(96) PRIMARY KEY,
  department_key VARCHAR(96) NOT NULL,
  display_name VARCHAR(96) NOT NULL,
  seniority_level VARCHAR(32) NOT NULL,
  rank_order INT NOT NULL DEFAULT 0,
  senior_seat BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_staff_positions_department (department_key, rank_order),
  CONSTRAINT fk_staff_positions_department FOREIGN KEY (department_key)
    REFERENCES staff_departments (department_key)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS staff_members (
  staff_member_id VARCHAR(96) PRIMARY KEY,
  identity_id VARCHAR(96) NULL,
  discord_user_id VARCHAR(32) NULL,
  minecraft_uuid CHAR(36) NULL,
  display_name VARCHAR(96) NOT NULL,
  status VARCHAR(32) NOT NULL,
  joined_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  left_at TIMESTAMP(3) NULL,
  active_discord_user_id VARCHAR(32) GENERATED ALWAYS AS (
    CASE WHEN status = 'ACTIVE' THEN discord_user_id ELSE NULL END
  ) STORED,
  active_minecraft_uuid CHAR(36) GENERATED ALWAYS AS (
    CASE WHEN status = 'ACTIVE' THEN minecraft_uuid ELSE NULL END
  ) STORED,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_staff_members_active_discord (active_discord_user_id),
  UNIQUE KEY uq_staff_members_active_minecraft (active_minecraft_uuid),
  INDEX idx_staff_members_identity (identity_id),
  INDEX idx_staff_members_status (status),
  CONSTRAINT fk_staff_members_identity FOREIGN KEY (identity_id)
    REFERENCES linked_identities (identity_id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS staff_assignments (
  assignment_id VARCHAR(96) PRIMARY KEY,
  staff_member_id VARCHAR(96) NOT NULL,
  department_key VARCHAR(96) NOT NULL,
  position_key VARCHAR(96) NOT NULL,
  status VARCHAR(32) NOT NULL,
  assigned_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at TIMESTAMP(3) NULL,
  active_staff_member_id VARCHAR(96) GENERATED ALWAYS AS (
    CASE WHEN status = 'ACTIVE' THEN staff_member_id ELSE NULL END
  ) STORED,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_staff_assignments_active_member (active_staff_member_id),
  INDEX idx_staff_assignments_department (department_key, status),
  INDEX idx_staff_assignments_position (position_key, status),
  CONSTRAINT fk_staff_assignments_member FOREIGN KEY (staff_member_id)
    REFERENCES staff_members (staff_member_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_staff_assignments_department FOREIGN KEY (department_key)
    REFERENCES staff_departments (department_key),
  CONSTRAINT fk_staff_assignments_position FOREIGN KEY (position_key)
    REFERENCES staff_positions (position_key)
);

CREATE TABLE IF NOT EXISTS staff_history (
  history_id VARCHAR(96) PRIMARY KEY,
  staff_member_id VARCHAR(96) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  actor_discord_user_id VARCHAR(32) NULL,
  from_department_key VARCHAR(96) NULL,
  from_position_key VARCHAR(96) NULL,
  to_department_key VARCHAR(96) NULL,
  to_position_key VARCHAR(96) NULL,
  reason VARCHAR(255) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_staff_history_member_created (staff_member_id, created_at),
  CONSTRAINT fk_staff_history_member FOREIGN KEY (staff_member_id)
    REFERENCES staff_members (staff_member_id)
    ON DELETE CASCADE
);

INSERT INTO staff_departments (department_key, display_name, description, sort_order)
VALUES
  ('direction', 'Direcao', 'Gestao executiva da Network.', 100),
  ('management', 'Gestao', 'Coordenacao operacional da staff.', 90),
  ('moderation', 'Moderacao', 'Moderacao, seguranca e aplicacao das regras.', 80),
  ('support', 'Suporte', 'Atendimento e ajuda aos jogadores.', 70),
  ('technical', 'Tecnico', 'Plugins, infraestrutura e operacao tecnica.', 60),
  ('creative', 'Criativo', 'Build, arte, eventos e experiencia visual.', 50),
  ('community', 'Comunidade', 'Eventos, comunidade e comunicacao.', 40)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  active = TRUE,
  updated_at = CURRENT_TIMESTAMP(3);

INSERT INTO staff_positions (position_key, department_key, display_name, seniority_level, rank_order, senior_seat)
VALUES
  ('direction.founder', 'direction', 'Fundador', 'OWNER', 120, TRUE),
  ('direction.director', 'direction', 'Diretor', 'DIRECTOR', 110, TRUE),
  ('management.manager', 'management', 'Gerente', 'MANAGER', 100, TRUE),
  ('management.coordinator', 'management', 'Coordenador', 'LEAD', 90, TRUE),
  ('moderation.senior', 'moderation', 'Moderador Senior', 'SENIOR', 80, TRUE),
  ('moderation.moderator', 'moderation', 'Moderador', 'MEMBER', 60, FALSE),
  ('moderation.helper', 'moderation', 'Ajudante', 'TRAINEE', 40, FALSE),
  ('support.senior', 'support', 'Suporte Senior', 'SENIOR', 80, TRUE),
  ('support.agent', 'support', 'Suporte', 'MEMBER', 60, FALSE),
  ('support.trainee', 'support', 'Suporte Trainee', 'TRAINEE', 40, FALSE),
  ('technical.senior', 'technical', 'Dev Senior', 'SENIOR', 80, TRUE),
  ('technical.developer', 'technical', 'Dev', 'MEMBER', 60, FALSE),
  ('creative.senior', 'creative', 'Criativo Senior', 'SENIOR', 80, TRUE),
  ('creative.builder', 'creative', 'Builder', 'MEMBER', 60, FALSE),
  ('community.senior', 'community', 'Comunidade Senior', 'SENIOR', 80, TRUE),
  ('community.events', 'community', 'Eventos', 'MEMBER', 60, FALSE)
ON DUPLICATE KEY UPDATE
  department_key = VALUES(department_key),
  display_name = VALUES(display_name),
  seniority_level = VALUES(seniority_level),
  rank_order = VALUES(rank_order),
  senior_seat = VALUES(senior_seat),
  active = TRUE,
  updated_at = CURRENT_TIMESTAMP(3);
