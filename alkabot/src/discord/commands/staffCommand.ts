import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type PolicyActor, type PolicyResult } from "../../application/policy/policyTypes.js";
import type { StaffDirectoryService } from "../../application/staff/staffDirectoryService.js";
import { StaffError } from "../../application/staff/staffTypes.js";
import { createDiscordPolicyActor } from "../permissions/discordPolicyActor.js";
import type { ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { renderStaffCareerPathCard, renderStaffListCard, renderStaffProfileCard } from "../ui/staffCards.js";

export const staffCommandData = new SlashCommandBuilder()
  .setName("staff")
  .setDescription("Consulta diretoria, equipe e trilhas de carreira da staff.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Lista membros ativos da staff.")
      .addStringOption((option) => option.setName("departamento").setDescription("Chave do departamento para filtrar.").setRequired(false))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("profile")
      .setDescription("Mostra o perfil de staff.")
      .addUserOption((option) => option.setName("discord").setDescription("Usuario Discord do membro da staff.").setRequired(false))
      .addStringOption((option) => option.setName("id").setDescription("ID interno do membro da staff.").setRequired(false))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("department")
      .setDescription("Mostra a trilha de carreira de um departamento.")
      .addStringOption((option) => option.setName("departamento").setDescription("Chave do departamento.").setRequired(true))
  );

export type StaffCommandDependencies = {
  staffDirectoryService: StaffDirectoryService;
  policyEngine: PolicyEngine;
  auditService: AuditService;
};

export function createStaffCommand(dependencies: StaffCommandDependencies): ChatInputCommandHandler {
  return {
    data: staffCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      const subcommand = interaction.options.getSubcommand();
      const actor = actorFromInteraction(interaction);
      const policyResult = authorizeStaffRead(dependencies.policyEngine, actor, `discord:/staff ${subcommand}`);
      if (!policyResult.allowed) {
        await auditStaffDenied(dependencies.auditService, interaction.id, actor, policyResult, `discord:/staff ${subcommand}`);
        await interaction.reply({
          content: "Voce nao tem permissao para ver o painel de staff.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      try {
        if (subcommand === "list") {
          const departmentKey = interaction.options.getString("departamento", false) ?? undefined;
          const result = await dependencies.staffDirectoryService.listStaff({
            ...(departmentKey == null ? {} : { departmentKey })
          });
          await auditStaffRead(dependencies.auditService, interaction.id, actor, "STAFF_LIST_VIEWED", "STAFF", "list", {
            departmentKey: departmentKey ?? "all",
            count: result.members.length,
            policyMatchedBy: policyResult.matchedBy
          });
          await interaction.editReply(renderStaffListCard(result));
          return;
        }

        if (subcommand === "profile") {
          const memberId = interaction.options.getString("id", false);
          const discordUser = interaction.options.getUser("discord", false);
          const profile =
            memberId == null
              ? await dependencies.staffDirectoryService.getProfileByDiscord(discordUser?.id ?? interaction.user.id)
              : await dependencies.staffDirectoryService.getProfileByMemberId(memberId);
          await auditStaffRead(dependencies.auditService, interaction.id, actor, "STAFF_PROFILE_VIEWED", "STAFF_MEMBER", profile.memberId, {
            policyMatchedBy: policyResult.matchedBy
          });
          await interaction.editReply(renderStaffProfileCard(profile));
          return;
        }

        if (subcommand === "department") {
          const departmentKey = interaction.options.getString("departamento", true);
          const path = dependencies.staffDirectoryService.getCareerPath(departmentKey);
          await auditStaffRead(dependencies.auditService, interaction.id, actor, "STAFF_CAREER_PATH_VIEWED", "STAFF_DEPARTMENT", path.department.key, {
            policyMatchedBy: policyResult.matchedBy,
            positions: path.positions.length
          });
          await interaction.editReply(renderStaffCareerPathCard(path));
          return;
        }

        await interaction.editReply("Subcomando desconhecido para /staff.");
      } catch (error) {
        if (error instanceof StaffError) {
          await auditStaffRead(dependencies.auditService, interaction.id, actor, "STAFF_VIEW_FAILED", "STAFF", subcommand, {
            reason: error.code,
            policyMatchedBy: policyResult.matchedBy
          });
          await interaction.editReply(messageForStaffError(error));
          return;
        }

        throw error;
      }
    }
  };
}

function authorizeStaffRead(policyEngine: PolicyEngine, actor: PolicyActor, source: string): PolicyResult {
  return policyEngine.evaluate({
    action: ALKA_PERMISSIONS.STAFF_READ,
    actor,
    resourceType: "STAFF",
    resourceId: "global",
    source
  });
}

async function auditStaffRead(
  auditService: AuditService,
  correlationId: string,
  actor: PolicyActor,
  eventType: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await auditService.record({
    correlationId,
    eventType,
    actor: {
      type: actor.type,
      id: actor.id
    },
    target: {
      type: targetType,
      id: targetId
    },
    source: "discord:/staff",
    metadata
  });
}

async function auditStaffDenied(
  auditService: AuditService,
  correlationId: string,
  actor: PolicyActor,
  policyResult: PolicyResult,
  source: string
): Promise<void> {
  await auditService.record({
    correlationId,
    eventType: "POLICY_DENIED",
    actor: {
      type: actor.type,
      id: actor.id
    },
    target: {
      type: "STAFF",
      id: "global"
    },
    source,
    severity: "WARNING",
    metadata: {
      action: ALKA_PERMISSIONS.STAFF_READ,
      reason: policyResult.reason
    }
  });
}

function actorFromInteraction(interaction: ChatInputCommandInteraction): PolicyActor {
  return createDiscordPolicyActor({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    guildOwnerId: interaction.guild?.ownerId,
    member: interaction.member
  });
}

function messageForStaffError(error: StaffError): string {
  switch (error.code) {
    case "STAFF_MEMBER_NOT_FOUND":
      return "Nao encontrei esse membro na staff ativa.";
    case "STAFF_DEPARTMENT_NOT_FOUND":
      return "Departamento de staff nao encontrado.";
  }
}
