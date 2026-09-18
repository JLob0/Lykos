import type { AuditEventRecord, AuditEventWriter } from "../../application/audit/auditTypes.js";
import type { DatabaseProvider } from "./databaseProvider.js";

export class AuditEventRepository implements AuditEventWriter {
  public constructor(private readonly database: DatabaseProvider) {}

  public async insert(event: AuditEventRecord): Promise<void> {
    await this.database.getPool().execute(
      `
        INSERT INTO audit_events (
          audit_id, correlation_id, event_type, actor_type, actor_id, target_type,
          target_id, source, severity, metadata_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event.auditId,
        event.correlationId,
        event.eventType,
        event.actor?.type ?? null,
        event.actor?.id ?? null,
        event.target?.type ?? null,
        event.target?.id ?? null,
        event.source,
        event.severity,
        event.metadata == null ? null : JSON.stringify(event.metadata),
        event.createdAt
      ]
    );
  }
}
