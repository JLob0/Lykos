import type { BridgeCommandDispatcherPort } from "../../bridge/commandDispatcher.js";
import type { CommandResult } from "../../contracts/envelopes.js";
import type { StaffSyncJob, StaffSyncRunItem, StaffSyncRunResult, StaffSyncStatus, StaffSyncStore } from "./staffTypes.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
type StaffSyncCompletionStatus = Exclude<StaffSyncStatus, "PENDING">;

export type StaffSyncRunInput = {
  targetServerId: string;
  actorDiscordUserId: string;
  limit?: number;
};

export class StaffSyncService {
  public constructor(
    private readonly store: StaffSyncStore,
    private readonly dispatcher: BridgeCommandDispatcherPort
  ) {}

  public async syncPending(input: StaffSyncRunInput): Promise<StaffSyncRunResult> {
    const limit = normalizeLimit(input.limit);
    const jobs = await this.store.listPendingStaffSyncJobs(limit);
    const items: StaffSyncRunItem[] = [];

    for (const job of jobs) {
      items.push(await this.syncJob(job, input));
    }

    return summarize(input.targetServerId, limit, items);
  }

  private async syncJob(job: StaffSyncJob, input: StaffSyncRunInput): Promise<StaffSyncRunItem> {
    try {
      const command = await this.dispatcher.dispatchStaffSync({
        serverId: input.targetServerId,
        actorDiscordUserId: input.actorDiscordUserId,
        staffMemberId: job.staffMemberId,
        payload: job.payload
      });
      await this.store.markStaffSyncDispatched({
        syncJobId: job.syncJobId,
        targetServerId: input.targetServerId,
        commandId: command.commandId,
        dispatchedAt: new Date()
      });

      const result = await this.dispatcher.waitForResult(command.commandId);
      if (result == null) {
        return {
          job,
          status: "DISPATCHED",
          commandId: command.commandId
        };
      }

      const completion = completionFromResult(result);
      if (completion.status !== "DISPATCHED") {
        await this.store.markStaffSyncCompleted({
          syncJobId: job.syncJobId,
          status: completion.status,
          completedAt: new Date(),
          ...(completion.errorCode == null ? {} : { errorCode: completion.errorCode }),
          ...(completion.errorMessage == null ? {} : { errorMessage: completion.errorMessage })
        });
      }

      return {
        job,
        commandId: command.commandId,
        status: completion.status,
        ...(completion.errorCode == null ? {} : { errorCode: completion.errorCode }),
        ...(completion.errorMessage == null ? {} : { errorMessage: completion.errorMessage })
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown staff sync dispatch failure.";
      await this.store.markStaffSyncCompleted({
        syncJobId: job.syncJobId,
        status: "FAILED",
        completedAt: new Date(),
        errorCode: "DISPATCH_FAILED",
        errorMessage: message
      });

      return {
        job,
        status: "FAILED",
        errorCode: "DISPATCH_FAILED",
        errorMessage: message
      };
    }
  }
}

function normalizeLimit(limit: number | undefined): number {
  if (limit == null) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function completionFromResult(result: CommandResult): {
  status: StaffSyncCompletionStatus;
  errorCode?: string;
  errorMessage?: string;
} {
  if (result.state === "SUCCESS") {
    return {
      status: "SUCCESS"
    };
  }

  if (result.state === "PARTIAL_FAILURE") {
    return {
      status: "PARTIAL_FAILURE",
      errorCode: result.error?.code ?? "PARTIAL_FAILURE",
      errorMessage: result.error?.message ?? "Staff sync completed with partial failures."
    };
  }

  if (result.state === "ACKNOWLEDGED" || result.state === "DISPATCHED" || result.state === "PENDING") {
    return {
      status: "DISPATCHED"
    };
  }

  return {
    status: "FAILED",
    errorCode: result.error?.code ?? result.state,
    errorMessage: result.error?.message ?? "Staff sync command failed."
  };
}

function summarize(targetServerId: string, requested: number, items: StaffSyncRunItem[]): StaffSyncRunResult {
  return {
    targetServerId,
    requested,
    processed: items.length,
    succeeded: items.filter((item) => item.status === "SUCCESS").length,
    failed: items.filter((item) => item.status === "FAILED").length,
    partial: items.filter((item) => item.status === "PARTIAL_FAILURE").length,
    items
  };
}
