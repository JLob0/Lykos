export type RolePlanMode = "LEAN" | "EXPANDED" | "FULL";

export type RoleBlueprint = {
  key: string;
  mode: RolePlanMode;
  name: string;
  colorHex: string;
  hoist: boolean;
  mentionable: boolean;
  group: string;
  priority: number;
};

export type CurrentDiscordRole = {
  id: string;
  name: string;
  managed: boolean;
  position: number;
  editable: boolean;
};

export type ImportedRoleRecord = {
  roleKey: string;
  discordRoleId?: string;
  status: "IMPORTED" | "APPLIED";
};

export type RolePlanActionState = "CREATE" | "REUSE" | "MANAGED" | "CONFLICT";

export type RolePlanAction = {
  state: RolePlanActionState;
  blueprint: RoleBlueprint;
  discordRoleId?: string;
  detail: string;
};

export type RolePlanSummary = Record<RolePlanActionState, number> & {
  currentRoles: number;
  projectedRoles: number;
  remainingCapacity: number;
};

export type RolePlan = {
  mode: RolePlanMode;
  maxRoles: number;
  generatedAt: Date;
  actions: RolePlanAction[];
  summary: RolePlanSummary;
};

export type RoleApplyResult = {
  runId: string;
  plan: RolePlan;
};

export interface RoleSetupStore {
  listImportedRoles(): Promise<ImportedRoleRecord[]>;
  upsertImportedRoles(actions: readonly RolePlanAction[], status: ImportedRoleRecord["status"]): Promise<number>;
  insertApplyRun(input: {
    runId: string;
    correlationId: string;
    mode: RolePlanMode;
    actorType: string;
    actorId: string;
    status: "IMPORTED" | "APPLIED";
    metadata: Record<string, unknown>;
  }): Promise<void>;
}
