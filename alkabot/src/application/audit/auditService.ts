import { randomUUID } from "node:crypto";
import type { AppLogger } from "../../logging/logger.js";
import type { AuditEventInput, AuditEventRecord, AuditEventWriter } from "./auditTypes.js";

export class AuditService {
  public constructor(
    private readonly writer: AuditEventWriter,
    private readonly logger: AppLogger
  ) {}

  public async record(input: AuditEventInput): Promise<AuditEventRecord> {
    const event: AuditEventRecord = {
      ...input,
      auditId: `audit_${randomUUID()}`,
      severity: input.severity ?? "INFO",
      createdAt: new Date()
    };

    await this.writer.insert(event);
    this.logger.info(
      {
        auditId: event.auditId,
        correlationId: event.correlationId,
        eventType: event.eventType,
        actorId: event.actor?.id,
        targetType: event.target?.type,
        targetId: event.target?.id
      },
      "Audit event recorded."
    );
    return event;
  }
}
