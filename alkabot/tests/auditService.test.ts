import { describe, expect, it, vi } from "vitest";
import { AuditService } from "../src/application/audit/auditService.js";
import type { AuditEventRecord, AuditEventWriter } from "../src/application/audit/auditTypes.js";
import type { AppLogger } from "../src/logging/logger.js";

describe("AuditService", () => {
  it("creates an immutable audit record with defaults", async () => {
    const writer = new MemoryAuditWriter();
    const service = new AuditService(writer, { info: vi.fn() } as unknown as AppLogger);

    const event = await service.record({
      correlationId: "corr_test",
      eventType: "NETWORK_STATUS_VIEWED",
      actor: {
        type: "DISCORD_USER",
        id: "111"
      },
      source: "test",
      metadata: {
        serverCount: 1
      }
    });

    expect(event.auditId).toMatch(/^audit_/u);
    expect(event.severity).toBe("INFO");
    expect(writer.events).toHaveLength(1);
    expect(writer.events[0]).toMatchObject({
      auditId: event.auditId,
      correlationId: "corr_test",
      eventType: "NETWORK_STATUS_VIEWED"
    });
  });
});

class MemoryAuditWriter implements AuditEventWriter {
  public readonly events: AuditEventRecord[] = [];

  public async insert(event: AuditEventRecord): Promise<void> {
    this.events.push(event);
  }
}
