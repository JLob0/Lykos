import type { StaffDepartment, StaffPosition } from "./staffTypes.js";

export const STAFF_DEPARTMENTS: StaffDepartment[] = [
  department("direction", "Direcao", 100, "Gestao executiva da Network."),
  department("management", "Gestao", 90, "Coordenacao operacional da staff."),
  department("moderation", "Moderacao", 80, "Moderacao, seguranca e aplicacao das regras."),
  department("support", "Suporte", 70, "Atendimento e ajuda aos jogadores."),
  department("technical", "Tecnico", 60, "Plugins, infraestrutura e operacao tecnica."),
  department("creative", "Criativo", 50, "Build, arte, eventos e experiencia visual."),
  department("community", "Comunidade", 40, "Eventos, comunidade e comunicacao.")
];

export const STAFF_POSITIONS: StaffPosition[] = [
  position("direction.founder", "direction", "Fundador", "OWNER", 120, true),
  position("direction.director", "direction", "Diretor", "DIRECTOR", 110, true),
  position("management.manager", "management", "Gerente", "MANAGER", 100, true),
  position("management.coordinator", "management", "Coordenador", "LEAD", 90, true),
  position("moderation.senior", "moderation", "Moderador Senior", "SENIOR", 80, true),
  position("moderation.moderator", "moderation", "Moderador", "MEMBER", 60),
  position("moderation.helper", "moderation", "Ajudante", "TRAINEE", 40),
  position("support.senior", "support", "Suporte Senior", "SENIOR", 80, true),
  position("support.agent", "support", "Suporte", "MEMBER", 60),
  position("support.trainee", "support", "Suporte Trainee", "TRAINEE", 40),
  position("technical.senior", "technical", "Dev Senior", "SENIOR", 80, true),
  position("technical.developer", "technical", "Dev", "MEMBER", 60),
  position("creative.senior", "creative", "Criativo Senior", "SENIOR", 80, true),
  position("creative.builder", "creative", "Builder", "MEMBER", 60),
  position("community.senior", "community", "Comunidade Senior", "SENIOR", 80, true),
  position("community.events", "community", "Eventos", "MEMBER", 60)
];

export function getStaffDepartment(key: string): StaffDepartment | undefined {
  return STAFF_DEPARTMENTS.find((departmentEntry) => departmentEntry.key === key);
}

export function getStaffPosition(key: string): StaffPosition | undefined {
  return STAFF_POSITIONS.find((positionEntry) => positionEntry.key === key);
}

export function getStaffCareerPath(departmentKey: string): StaffPosition[] {
  return STAFF_POSITIONS.filter((positionEntry) => positionEntry.departmentKey === departmentKey).sort((left, right) => left.rankOrder - right.rankOrder);
}

function department(key: string, name: string, sortOrder: number, description: string): StaffDepartment {
  return {
    key,
    name,
    description,
    sortOrder
  };
}

function position(
  key: string,
  departmentKey: string,
  name: string,
  seniorityLevel: StaffPosition["seniorityLevel"],
  rankOrder: number,
  seniorSeat = false
): StaffPosition {
  return {
    key,
    departmentKey,
    name,
    seniorityLevel,
    rankOrder,
    seniorSeat
  };
}
