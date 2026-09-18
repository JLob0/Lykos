import type { StaffCareerPath, StaffDirectorySummary, StaffMemberProfile } from "../../application/staff/staffTypes.js";
import { alkaContainer, componentsV2Message, separator, textDisplay, type ComponentsV2Message } from "./componentsV2.js";

export function renderStaffListCard(input: { summary: StaffDirectorySummary; members: StaffMemberProfile[] }): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(
        [
          "## ALKASTUDIO - STAFF",
          `**Ativos:** ${input.summary.activeStaff}`,
          `**Departamentos:** ${input.summary.departments}`,
          `**Senior seats:** ${input.summary.seniorSeatsFilled}/${input.summary.seniorSeatsTotal}`,
          `**Vagos:** ${input.summary.seniorSeatsVacant}`
        ].join("\n")
      ),
      separator(),
      textDisplay(renderStaffRows(input.members))
    ])
  ]);
}

export function renderStaffProfileCard(profile: StaffMemberProfile): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(
        [
          "## ALKASTUDIO - STAFF PROFILE",
          `**Nome:** ${profile.displayName}`,
          `**Status:** ${profile.status}`,
          `**Departamento:** ${profile.department?.name ?? "sem departamento"}`,
          `**Cargo:** ${profile.position?.name ?? "sem cargo"}`,
          `**Senioridade:** ${profile.position?.seniorityLevel ?? "n/a"}`
        ].join("\n")
      ),
      separator(),
      textDisplay(
        [
          `**Discord:** ${profile.discordUserId == null ? "nao vinculado" : `<@${profile.discordUserId}>`}`,
          `**Minecraft:** ${profile.minecraftUuid ?? "nao vinculado"}`,
          `**Entrada:** ${profile.joinedAt.toISOString()}`,
          `**Anterior:** ${profile.previousPosition?.name ?? "n/a"}`,
          `**Proximo:** ${profile.nextPosition?.name ?? "topo da trilha"}`
        ].join("\n")
      )
    ])
  ]);
}

export function renderStaffCareerPathCard(path: StaffCareerPath): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(`## ALKASTUDIO - CARREIRA\n**Departamento:** ${path.department.name}\n${path.department.description ?? ""}`),
      separator(),
      textDisplay(path.positions.length === 0 ? "Nenhum cargo ativo nessa trilha." : path.positions.map(renderPositionLine).join("\n"))
    ])
  ]);
}

function renderStaffRows(members: StaffMemberProfile[]): string {
  if (members.length === 0) {
    return "Nenhum membro ativo encontrado para esse filtro.";
  }

  return members
    .map((member) => `**${member.displayName}** - ${member.position?.name ?? "sem cargo"} - ${member.department?.name ?? "sem departamento"}`)
    .join("\n");
}

function renderPositionLine(position: StaffCareerPath["positions"][number]): string {
  const seat = position.seniorSeat ? " - senior seat" : "";
  return `**${position.name}** \`${position.key}\` - ${position.seniorityLevel}${seat}`;
}
