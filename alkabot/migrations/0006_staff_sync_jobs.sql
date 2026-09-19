CREATE TABLE IF NOT EXISTS staff_sync_jobs (
  sync_job_id VARCHAR(96) PRIMARY KEY,
  staff_member_id VARCHAR(96) NOT NULL,
  assignment_id VARCHAR(96) NOT NULL,
  history_id VARCHAR(96) NOT NULL,
  status VARCHAR(32) NOT NULL,
  target_server_id VARCHAR(96) NULL,
  command_id VARCHAR(96) NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error_code VARCHAR(96) NULL,
  last_error_message VARCHAR(255) NULL,
  payload_json JSON NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  dispatched_at TIMESTAMP(3) NULL,
  completed_at TIMESTAMP(3) NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_staff_sync_status_created (status, created_at),
  INDEX idx_staff_sync_member (staff_member_id, created_at),
  INDEX idx_staff_sync_history (history_id),
  CONSTRAINT fk_staff_sync_member FOREIGN KEY (staff_member_id)
    REFERENCES staff_members (staff_member_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_staff_sync_assignment FOREIGN KEY (assignment_id)
    REFERENCES staff_assignments (assignment_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_staff_sync_history FOREIGN KEY (history_id)
    REFERENCES staff_history (history_id)
    ON DELETE CASCADE
);
