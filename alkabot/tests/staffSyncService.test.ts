import { describe, expect, it, vi } from "vitest";
import type { BridgeCommandDispatcherPort, StaffSyncDispatchInput } from "../src/bridge/commandDispatcher.js";
import { StaffSyncService } from "../src/application/staff/staffSyncService.js";
import type { StaffSyncJob, StaffSyncStore } from "../src/application/staff/staffTypes.js";
import type { CommandEnvelope, CommandResult } from "../src/contracts/envelopes.js";

describe("StaffSyncService", () => {
  it("dispatches pending staff sync jobs and marks successful results", async () => {
    const job = staffSyncJob();
    const store = syncStore([job]);
    const dispatcher = dispatcherStub({
      result: commandResult({
        state: "SUCCESS"
      })
    });
    const service = new StaffSyncService(store, dispatcher);

    const result = await service.syncPending({
      targetServerId: "rankup-01",
      actorDiscordUserId: "123456789012345678",
      limit: 5
    });

    expect(store.listPendingStaffSyncJobs).toHaveBeenCalledWith(5);
    expect(dispatcher.dispatchStaffSync).toHaveBeenCalledWith({
      serverId: "rankup-01",
      actorDiscordUserId: "123456789012345678",
      staffMemberId: "staff_1",
      payload: job.payload
    });
    expect(store.markStaffSyncDispatched).toHaveBeenCalledWith(
      expect.objectContaining({
        syncJobId: "staff_sync_1",
        targetServerId: "rankup-01",
        commandId: "cmd_staff_sync"
      })
    );
    expect(store.markStaffSyncCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        syncJobId: "staff_sync_1",
        status: "SUCCESS"
      })
    );
    expect(result).toMatchObject({
      targetServerId: "rankup-01",
      requested: 5,
      processed: 1,
      succeeded: 1,
      failed: 0,
      partial: 0
    });
  });

  it("keeps a dispatched job open when the bridge result does not arrive yet", async () => {
    const store = syncStore([staffSyncJob()]);
    const dispatcher = dispatcherStub({});
    const service = new StaffSyncService(store, dispatcher);

    const result = await service.syncPending({
      targetServerId: "rankup-01",
      actorDiscordUserId: "123456789012345678"
    });

    expect(store.listPendingStaffSyncJobs).toHaveBeenCalledWith(10);
    expect(store.markStaffSyncCompleted).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      requested: 10,
      processed: 1,
      succeeded: 0,
      failed: 0,
      partial: 0,
      items: [
        expect.objectContaining({
          status: "DISPATCHED",
          commandId: "cmd_staff_sync"
        })
      ]
    });
  });

  it("marks the job as failed when dispatching to the bridge throws", async () => {
    const store = syncStore([staffSyncJob()]);
    const dispatcher = dispatcherStub({
      dispatchError: new Error("Redis unavailable")
    });
    const service = new StaffSyncService(store, dispatcher);

    const result = await service.syncPending({
      targetServerId: "rankup-01",
      actorDiscordUserId: "123456789012345678",
      limit: 1
    });

    expect(store.markStaffSyncDispatched).not.toHaveBeenCalled();
    expect(store.markStaffSyncCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        syncJobId: "staff_sync_1",
        status: "FAILED",
        errorCode: "DISPATCH_FAILED",
        errorMessage: "Redis unavailable"
      })
    );
    expect(result).toMatchObject({
      processed: 1,
      failed: 1,
      items: [
        expect.objectContaining({
          status: "FAILED",
          errorCode: "DISPATCH_FAILED"
        })
      ]
    });
  });
});

function syncStore(jobs: StaffSyncJob[]): StaffSyncStore {
  return {
    listPendingStaffSyncJobs: vi.fn(async () => jobs),
    markStaffSyncDispatched: vi.fn(async () => undefined),
    markStaffSyncCompleted: vi.fn(async () => undefined)
  };
}

function dispatcherStub(input: { result?: CommandResult; dispatchError?: Error }): BridgeCommandDispatcherPort {
  return {
    dispatchBridgePing: vi.fn(async () => commandEnvelope("bridge.ping")),
    dispatchStaffSync: vi.fn(async (_dispatch: StaffSyncDispatchInput) => {
      if (input.dispatchError != null) {
        throw input.dispatchError;
      }

      return commandEnvelope("staff.sync");
    }),
    waitForResult: vi.fn(async () => input.result)
  };
}

function staffSyncJob(overrides: Partial<StaffSyncJob> = {}): StaffSyncJob {
  return {
    syncJobId: "staff_sync_1",
    staffMemberId: "staff_1",
    assignmentId: "assignment_1",
    historyId: "history_1",
    status: "PENDING",
    attempts: 0,
    payload: {
      version: 1,
      syncJobId: "staff_sync_1",
      staffMemberId: "staff_1",
      assignmentId: "assignment_1",
      historyId: "history_1",
      discordUserId: "123456789012345678",
      minecraftUuid: "123e4567-e89b-12d3-a456-426614174000",
      displayName: "MestreBR",
      target: {
        departmentKey: "moderation",
        positionKey: "moderation.senior",
        seniorityLevel: "SENIOR",
        seniorSeat: true
      },
      projection: {
        discordRoleKeys: ["alka.senior.staff", "alka.staff"],
        minecraftPermissionGroups: ["staff.moderation-senior"]
      }
    },
    createdAt: new Date("2026-09-18T15:00:00.000Z"),
    ...overrides
  };
}

function commandEnvelope(command: string): CommandEnvelope {
  return {
    commandId: "cmd_staff_sync",
    correlationId: "corr_staff_sync",
    command,
    version: 1,
    targetServer: "rankup-01",
    issuedAt: "2026-09-18T15:00:00.000Z",
    expiresAt: "2026-09-18T15:00:30.000Z",
    actor: {
      discordUserId: "123456789012345678",
      staffMemberId: "staff_1",
      permissionsSnapshot: ["alka.staff.sync"]
    },
    data: {}
  };
}

function commandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  return {
    commandId: "cmd_staff_sync",
    correlationId: "corr_staff_sync",
    state: "SUCCESS",
    targetServer: "rankup-01",
    timestamp: "2026-09-18T15:00:01.000Z",
    data: {
      accepted: true
    },
    ...overrides
  };
}
