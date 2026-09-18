export type AuditSeverity = "INFO" | "NOTICE" | "WARNING" | "CRITICAL";

export type AuditActor = {
  type: "DISCORD_USER" | "SYSTEM";
  id: string;
};

export type AuditTarget = {
  type: string;
  id: string;
};

export type AuditEventInput = {
  correlationId: string;
  eventType: string;
  actor?: AuditActor;
  target?: AuditTarget;
  source: string;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
};

export type AuditEventRecord = AuditEventInput & {
  auditId: string;
  severity: AuditSeverity;
  createdAt: Date;
};

export interface AuditEventWriter {
  insert(event: AuditEventRecord): Promise<void>;
}
