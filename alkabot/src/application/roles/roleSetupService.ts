import { randomUUID } from "node:crypto";
import { createRolePlan } from "./rolePlanner.js";
import type { CurrentDiscordRole, RoleApplyResult, RolePlan, RolePlanMode, RoleSetupStore } from "./rolePlannerTypes.js";

export class RoleSetupService {
  public constructor(private readonly store: RoleSetupStore) {}

  public async planRoles(input: { mode: RolePlanMode; currentRoles: readonly CurrentDiscordRole[] }): Promise<RolePlan> {
    return createRolePlan({
      mode: input.mode,
      currentRoles: input.currentRoles,
      importedRoles: await this.store.listImportedRoles()
    });
  }

  public async importRoles(input: {
    mode: RolePlanMode;
    currentRoles: readonly CurrentDiscordRole[];
    correlationId: string;
    actorType: string;
    actorId: string;
  }): Promise<RoleApplyResult> {
    const plan = await this.planRoles(input);
    await this.store.upsertImportedRoles(plan.actions, "IMPORTED");
    const runId = `setup_role_import_${randomUUID()}`;
    await this.store.insertApplyRun({
      runId,
      correlationId: input.correlationId,
      mode: input.mode,
      actorType: input.actorType,
      actorId: input.actorId,
      status: "IMPORTED",
      metadata: {
        summary: plan.summary
      }
    });

    return { runId, plan };
  }

  public async applyRoles(input: {
    mode: RolePlanMode;
    currentRoles: readonly CurrentDiscordRole[];
    correlationId: string;
    actorType: string;
    actorId: string;
  }): Promise<RoleApplyResult> {
    const plan = await this.planRoles(input);
    await this.store.upsertImportedRoles(plan.actions, "APPLIED");
    const runId = `setup_role_apply_${randomUUID()}`;
    await this.store.insertApplyRun({
      runId,
      correlationId: input.correlationId,
      mode: input.mode,
      actorType: input.actorType,
      actorId: input.actorId,
      status: "APPLIED",
      metadata: {
        summary: plan.summary,
        discordMutation: false
      }
    });

    return { runId, plan };
  }
}
