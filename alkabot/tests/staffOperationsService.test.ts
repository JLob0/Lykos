import { describe, expect, it, vi } from "vitest";
import { StaffOperationsService } from "../src/application/staff/staffOperationsService.js";
import type {
  StaffAssignmentChangeInput,
  StaffMemberRecord,
  StaffOperationsStore
} from "../src/application/staff/staffTypes.js";

describe("StaffOperationsService", () => {
  it("previews a promotion without mutating staff assignments", async () => {
    const store = operationsStore([
      staffRecord({
        memberId: "staff_1",
        positionKey: "moderation.moderator"
      })
    ]);
    const service = new StaffOperationsService(store);

    const result = await service.promote({
      memberId: "staff_1",
      actorDiscordUserId: "111",
      reason: "Bom desempenho.",
      confirmed: false
    });

    expect(result).toMatchObject({
      status: "PREVIEW",
      requiresConfirmation: true,
      fromPosition: {
        key: "moderation.moderator"
      },
      toPosition: {
        key: "moderation.senior"
      }
    });
    expect(store.applyAssignmentChange).not.toHaveBeenCalled();
  });

  it("blocks a promotion when the department senior seat is already occupied", async () => {
    const store = operationsStore([
      staffRecord({
        memberId: "staff_1",
        displayName: "MestreBR",
        positionKey: "moderation.moderator"
      }),
      staffRecord({
        memberId: "staff_2",
        displayName: "Bnzinn",
        positionKey: "moderation.senior"
      })
    ]);
    const service = new StaffOperationsService(store);

    const result = await service.promote({
      memberId: "staff_1",
      actorDiscordUserId: "111",
      reason: "Tentativa de segundo senior.",
      confirmed: true
    });

    expect(result).toMatchObject({
      status: "BLOCKED",
      blockReason: "SENIOR_SEAT_OCCUPIED",
      seniorSeatHolder: {
        memberId: "staff_2"
      }
    });
    expect(store.applyAssignmentChange).not.toHaveBeenCalled();
  });

  it("applies a confirmed demotion and writes history metadata", async () => {
    const store = operationsStore([
      staffRecord({
        memberId: "staff_1",
        positionKey: "support.senior"
      })
    ]);
    const service = new StaffOperationsService(store);

    const result = await service.demote({
      memberId: "staff_1",
      actorDiscordUserId: "111",
      reason: "Reorganizacao.",
      confirmed: true
    });

    expect(result).toMatchObject({
      status: "APPLIED",
      toPosition: {
        key: "support.agent"
      }
    });
    expect(store.applyAssignmentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        staffMemberId: "staff_1",
        actorDiscordUserId: "111",
        eventType: "STAFF_DEMOTED",
        fromDepartmentKey: "support",
        fromPositionKey: "support.senior",
        toDepartmentKey: "support",
        toPositionKey: "support.agent",
        reason: "Reorganizacao.",
        metadata: {
          operation: "DEMOTE",
          pendingExternalSync: true
        },
        syncJobId: expect.stringMatching(/^staff_sync_/u),
        syncPayload: expect.objectContaining({
          version: 1,
          staffMemberId: "staff_1",
          target: expect.objectContaining({
            departmentKey: "support",
            positionKey: "support.agent"
          }),
          projection: expect.objectContaining({
            discordRoleKeys: expect.arrayContaining(["alka.staff", "alka.support"]),
            minecraftPermissionGroups: expect.arrayContaining(["staff.support-agent"])
          })
        })
      })
    );
  });
});

function staffRecord(overrides: Partial<StaffMemberRecord> = {}): StaffMemberRecord {
  const positionKey = overrides.positionKey ?? "moderation.moderator";
  const departmentKey = positionKey.split(".")[0] ?? "moderation";
  return {
    memberId: "staff_1",
    discordUserId: "111",
    displayName: "MestreBR",
    status: "ACTIVE",
    joinedAt: new Date("2026-09-18T15:00:00.000Z"),
    departmentKey,
    positionKey,
    assignedAt: new Date("2026-09-18T15:00:00.000Z"),
    ...overrides
  };
}

function operationsStore(records: StaffMemberRecord[]): StaffOperationsStore {
  return {
    async listActiveStaff() {
      return records.filter((record) => record.status === "ACTIVE");
    },
    async findActiveStaffByDiscord(discordUserId) {
      return records.find((record) => record.discordUserId === discordUserId && record.status === "ACTIVE");
    },
    async findStaffByMemberId(memberId) {
      return records.find((record) => record.memberId === memberId);
    },
    applyAssignmentChange: vi.fn(async (input: StaffAssignmentChangeInput) => ({
      assignmentId: input.assignmentId,
      historyId: input.historyId,
      syncJobId: input.syncJobId,
      appliedAt: input.appliedAt
    }))
  };
}
