import type { RoleBlueprint, RolePlanMode } from "./rolePlannerTypes.js";

const LEAN_ROLES: RoleBlueprint[] = [
  role("staff", "LEAN", "Alka Staff", "staff", 100, "#8B5CF6", true),
  role("leadership", "LEAN", "Alka Lideranca", "leadership", 90, "#F59E0B", true),
  role("department.community", "LEAN", "Comunidade", "department", 60, "#22C55E"),
  role("department.technical", "LEAN", "Tecnico", "department", 60, "#38BDF8"),
  role("department.creative", "LEAN", "Criativo", "department", 60, "#EC4899")
];

const EXPANDED_EXTRA_ROLES: RoleBlueprint[] = [
  role("management", "EXPANDED", "Gestao", "management", 85, "#F97316", true),
  role("moderation", "EXPANDED", "Moderacao", "operations", 70, "#EF4444"),
  role("support", "EXPANDED", "Suporte", "operations", 65, "#10B981"),
  role("developer", "EXPANDED", "Dev", "technical", 65, "#06B6D4"),
  role("builder", "EXPANDED", "Builder", "creative", 55, "#A3E635"),
  role("designer", "EXPANDED", "Designer", "creative", 55, "#F472B6")
];

const FULL_EXTRA_ROLES: RoleBlueprint[] = [
  role("founder", "FULL", "Fundador", "direction", 120, "#FACC15", true),
  role("cofounder", "FULL", "Cofundador", "direction", 118, "#FDE68A", true),
  role("ceo", "FULL", "CEO", "direction", 115, "#F59E0B", true),
  role("cto", "FULL", "CTO", "direction", 114, "#38BDF8", true),
  role("community.director", "FULL", "Diretor de Comunidade", "direction", 112, "#22C55E", true),
  role("senior.staff", "FULL", "Staff Senior", "seniority", 82, "#A78BFA"),
  role("trainee.staff", "FULL", "Staff Trainee", "seniority", 40, "#94A3B8"),
  role("marketing", "FULL", "Marketing", "creative", 50, "#FB7185"),
  role("events", "FULL", "Eventos", "community", 45, "#FBBF24"),
  role("qa", "FULL", "QA", "technical", 45, "#67E8F9")
];

export function getRoleCatalog(mode: RolePlanMode): RoleBlueprint[] {
  switch (mode) {
    case "LEAN":
      return [...LEAN_ROLES];
    case "EXPANDED":
      return [...LEAN_ROLES, ...EXPANDED_EXTRA_ROLES].map((blueprint) => normalizeMode(blueprint, mode));
    case "FULL":
      return [...LEAN_ROLES, ...EXPANDED_EXTRA_ROLES, ...FULL_EXTRA_ROLES].map((blueprint) => normalizeMode(blueprint, mode));
  }
}

function role(
  key: string,
  mode: RolePlanMode,
  name: string,
  group: string,
  priority: number,
  colorHex: string,
  hoist = false
): RoleBlueprint {
  return {
    key: `alka.${key}`,
    mode,
    name,
    colorHex,
    hoist,
    mentionable: false,
    group,
    priority
  };
}

function normalizeMode(blueprint: RoleBlueprint, mode: RolePlanMode): RoleBlueprint {
  return {
    ...blueprint,
    mode
  };
}
