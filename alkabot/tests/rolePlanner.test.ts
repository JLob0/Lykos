import { describe, expect, it } from "vitest";
import { createRolePlan } from "../src/application/roles/rolePlanner.js";
import { RoleSetupService } from "../src/application/roles/roleSetupService.js";
import type { ImportedRoleRecord, RolePlanAction, RoleSetupStore } from "../src/application/roles/rolePlannerTypes.js";

describe("createRolePlan", () => {
  it("reuses existing roles by name and preserves capacity buffer", () => {
    const plan = createRolePlan({
      mode: "LEAN",
      currentRoles: [
        {
          id: "role_staff",
          name: "Alka Staff",
          managed: false,
          position: 10,
          editable: true
        }
      ],
      now: new Date("2026-09-18T15:00:00.000Z")
    });

    expect(plan.summary.REUSE).toBe(1);
    expect(plan.summary.CREATE).toBe(4);
    expect(plan.summary.remainingCapacity).toBe(235);
    expect(plan.actions[0]).toMatchObject({
      state: "REUSE",
      discordRoleId: "role_staff"
    });
  });

  it("marks imported roles as managed when their persisted Discord role still exists", () => {
    const plan = createRolePlan({
      mode: "LEAN",
      currentRoles: [
        {
          id: "role_staff",
          name: "Alka Staff",
          managed: false,
          position: 10,
          editable: true
        }
      ],
      importedRoles: [
        {
          roleKey: "alka.staff",
          discordRoleId: "role_staff",
          status: "APPLIED"
        }
      ]
    });

    expect(plan.actions[0]).toMatchObject({
      state: "MANAGED",
      discordRoleId: "role_staff"
    });
  });
});

describe("RoleSetupService", () => {
  it("imports role blueprints idempotently through the store", async () => {
    const store = new MemoryRoleSetupStore();
    const service = new RoleSetupService(store);

    const result = await service.importRoles({
      mode: "LEAN",
      currentRoles: [],
      correlationId: "corr_test",
      actorType: "DISCORD_USER",
      actorId: "111"
    });

    expect(result.runId).toMatch(/^setup_role_import_/u);
    expect(store.records).toHaveLength(5);
    expect(store.runs[0]).toMatchObject({
      correlationId: "corr_test",
      mode: "LEAN",
      status: "IMPORTED"
    });
  });

  it("records apply without requiring Discord role mutation", async () => {
    const store = new MemoryRoleSetupStore();
    const service = new RoleSetupService(store);

    const result = await service.applyRoles({
      mode: "EXPANDED",
      currentRoles: [],
      correlationId: "corr_apply",
      actorType: "DISCORD_USER",
      actorId: "111"
    });

    expect(result.runId).toMatch(/^setup_role_apply_/u);
    expect(store.records.every((record) => record.status === "APPLIED")).toBe(true);
    expect(store.runs[0]?.metadata).toMatchObject({
      discordMutation: false
    });
  });
});

class MemoryRoleSetupStore implements RoleSetupStore {
  public readonly records: ImportedRoleRecord[] = [];
  public readonly runs: Array<{
    runId: string;
    correlationId: string;
    mode: string;
    actorType: string;
    actorId: string;
    status: "IMPORTED" | "APPLIED";
    metadata: Record<string, unknown>;
  }> = [];

  public async listImportedRoles(): Promise<ImportedRoleRecord[]> {
    return [...this.records];
  }

  public async upsertImportedRoles(actions: readonly RolePlanAction[], status: ImportedRoleRecord["status"]): Promise<number> {
    for (const action of actions) {
      const existingIndex = this.records.findIndex((record) => record.roleKey === action.blueprint.key);
      const record: ImportedRoleRecord = {
        roleKey: action.blueprint.key,
        status
      };

      if (action.discordRoleId != null) {
        record.discordRoleId = action.discordRoleId;
      }

      if (existingIndex >= 0) {
        this.records[existingIndex] = record;
      } else {
        this.records.push(record);
      }
    }

    return actions.length;
  }

  public async insertApplyRun(input: {
    runId: string;
    correlationId: string;
    mode: string;
    actorType: string;
    actorId: string;
    status: "IMPORTED" | "APPLIED";
    metadata: Record<string, unknown>;
  }): Promise<void> {
    this.runs.push(input);
  }
}
