import { getRoleCatalog } from "./roleCatalog.js";
import type { CurrentDiscordRole, ImportedRoleRecord, RoleBlueprint, RolePlan, RolePlanAction, RolePlanMode, RolePlanSummary } from "./rolePlannerTypes.js";

export const DISCORD_ROLE_CAPACITY = 250;
const RESERVED_ROLE_BUFFER = 10;

export function createRolePlan(input: {
  mode: RolePlanMode;
  currentRoles: readonly CurrentDiscordRole[];
  importedRoles?: readonly ImportedRoleRecord[];
  now?: Date;
}): RolePlan {
  const importedByKey = new Map((input.importedRoles ?? []).map((role) => [role.roleKey, role]));
  const currentById = new Map(input.currentRoles.map((role) => [role.id, role]));
  const currentByName = new Map(input.currentRoles.map((role) => [normalizeName(role.name), role]));

  const actions = getRoleCatalog(input.mode)
    .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key))
    .map((blueprint) => createAction(blueprint, importedByKey, currentById, currentByName));

  return {
    mode: input.mode,
    maxRoles: DISCORD_ROLE_CAPACITY,
    generatedAt: input.now ?? new Date(),
    actions,
    summary: summarize(input.currentRoles.length, actions)
  };
}

function createAction(
  blueprint: RoleBlueprint,
  importedByKey: ReadonlyMap<string, ImportedRoleRecord>,
  currentById: ReadonlyMap<string, CurrentDiscordRole>,
  currentByName: ReadonlyMap<string, CurrentDiscordRole>
): RolePlanAction {
  const imported = importedByKey.get(blueprint.key);
  const importedCurrentRole = imported?.discordRoleId == null ? undefined : currentById.get(imported.discordRoleId);
  if (importedCurrentRole != null) {
    return {
      state: "MANAGED",
      blueprint,
      discordRoleId: importedCurrentRole.id,
      detail: `Cargo ja gerenciado no banco como ${importedCurrentRole.name}.`
    };
  }

  const sameName = currentByName.get(normalizeName(blueprint.name));
  if (sameName != null) {
    return {
      state: sameName.managed ? "CONFLICT" : "REUSE",
      blueprint,
      discordRoleId: sameName.id,
      detail: sameName.managed ? "Cargo existente e gerenciado por integracao externa." : "Cargo existente pode ser reaproveitado."
    };
  }

  return {
    state: "CREATE",
    blueprint,
    detail: "Cargo ainda nao existe; criacao fisica exige apply com confirmacao em bloco futuro."
  };
}

function summarize(currentRoleCount: number, actions: readonly RolePlanAction[]): RolePlanSummary {
  const createCount = actions.filter((action) => action.state === "CREATE").length;
  const projectedRoles = currentRoleCount + createCount;

  return {
    CREATE: createCount,
    REUSE: actions.filter((action) => action.state === "REUSE").length,
    MANAGED: actions.filter((action) => action.state === "MANAGED").length,
    CONFLICT: actions.filter((action) => action.state === "CONFLICT").length,
    currentRoles: currentRoleCount,
    projectedRoles,
    remainingCapacity: Math.max(0, DISCORD_ROLE_CAPACITY - RESERVED_ROLE_BUFFER - projectedRoles)
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
