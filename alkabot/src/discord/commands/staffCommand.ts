import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type PolicyActor, type PolicyResult } from "../../application/policy/policyTypes.js";
import type { StaffDirectoryService } from "../../application/staff/staffDirectoryService.js";
import type { StaffOperationsService } from "../../application/staff/staffOperationsService.js";
import type { StaffSyncService } from "../../application/staff/staffSyncService.js";
import type { StaffOperationResult } from "../../application/staff/staffTypes.js";
import { StaffError } from "../../application/staff/staffTypes.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import { createDiscordPolicyActor } from "../permissions/discordPolicyActor.js";
import type { ChatInputCommandHandler } from "../interactions/slashCommand.js";
import {
  renderStaffCareerPathCard,
  renderStaffListCard,
  renderStaffOperationCard,
  renderStaffProfileCard,
  renderStaffSyncCard
} from "../ui/staffCards.js";

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
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("promote")
      .setDescription("Planeja ou aplica a proxima promocao de um membro da staff.")
      .addStringOption((option) => option.setName("id").setDescription("ID interno do membro da staff.").setRequired(true))
      .addStringOption((option) => option.setName("motivo").setDescription("Motivo da promocao.").setRequired(true))
      .addBooleanOption((option) => option.setName("confirmar").setDescription("Quando true, aplica a alteracao no banco.").setRequired(false))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("demote")
      .setDescription("Planeja ou aplica o rebaixamento anterior da trilha de carreira.")
      .addStringOption((option) => option.setName("id").setDescription("ID interno do membro da staff.").setRequired(true))
      .addStringOption((option) => option.setName("motivo").setDescription("Motivo do rebaixamento.").setRequired(true))
      .addBooleanOption((option) => option.setName("confirmar").setDescription("Quando true, aplica a alteracao no banco.").setRequired(false))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("sync")
      .setDescription("Reconcilia pendencias de cargo da staff com o Bridge.")
      .addStringOption((option) => option.setName("servidor").setDescription("ID do servidor Bridge alvo.").setRequired(true))
      .addIntegerOption((option) => option.setName("limite").setDescription("Quantidade maxima de pendencias.").setMinValue(1).setMaxValue(25).setRequired(false))
  );

export type StaffCommandDependencies = {
  registry: ServerRegistry;
  staffDirectoryService: StaffDirectoryService;
  staffOperationsService: StaffOperationsService;
  staffSyncService: StaffSyncService;
  policyEngine: PolicyEngine;
  auditService: AuditService;
};

export function createStaffCommand(dependencies: StaffCommandDependencies): ChatInputCommandHandler {
  return {
    data: staffCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      const subcommand = interaction.options.getSubcommand();
      const actor = actorFromInteraction(interaction);
      const action = actionForSubcommand(subcommand);
      const policyResult = authorizeStaffAction(dependencies.policyEngine, actor, action, `discord:/staff ${subcommand}`);
      if (!policyResult.allowed) {
        await auditStaffDenied(dependencies.auditService, interaction.id, actor, policyResult, action, `discord:/staff ${subcommand}`);
        await interaction.reply({
          content: messageForDeniedAction(action),
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

        if (subcommand === "promote" || subcommand === "demote") {
          const result =
            subcommand === "promote"
              ? await dependencies.staffOperationsService.promote(operationInputFromInteraction(interaction, actor.id))
              : await dependencies.staffOperationsService.demote(operationInputFromInteraction(interaction, actor.id));
          await auditStaffOperation(dependencies.auditService, interaction.id, actor, result, policyResult);
          await interaction.editReply(renderStaffOperationCard(result));
          return;
        }

        if (subcommand === "sync") {
          const targetServerId = interaction.options.getString("servidor", true);
          const serverNode = dependencies.registry.get(targetServerId);
          if (serverNode == null) {
            await auditStaffRead(dependencies.auditService, interaction.id, actor, "STAFF_SYNC_FAILED", "SERVER", targetServerId, {
              reason: "SERVER_NOT_FOUND",
              policyMatchedBy: policyResult.matchedBy
            });
            await interaction.editReply("Servidor Bridge nao encontrado para o sync de staff.");
            return;
          }

          const syncLimit = interaction.options.getInteger("limite", false) ?? undefined;
          const result = await dependencies.staffSyncService.syncPending({
            targetServerId,
            actorDiscordUserId: actor.id,
            ...(syncLimit == null ? {} : { limit: syncLimit })
          });
          await auditStaffRead(dependencies.auditService, interaction.id, actor, "STAFF_SYNC_RUN", "SERVER", targetServerId, {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            partial: result.partial,
            policyMatchedBy: policyResult.matchedBy
          });
          await interaction.editReply(renderStaffSyncCard(result));
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

function authorizeStaffAction(
  policyEngine: PolicyEngine,
  actor: PolicyActor,
  action: (typeof ALKA_PERMISSIONS)[keyof typeof ALKA_PERMISSIONS],
  source: string
): PolicyResult {
  return policyEngine.evaluate({
    action,
    actor,
    resourceType: "STAFF",
    resourceId: "global",
    source
  });
}

async function auditStaffOperation(
  auditService: AuditService,
  correlationId: string,
  actor: PolicyActor,
  result: StaffOperationResult,
  policyResult: PolicyResult
): Promise<void> {
  await auditService.record({
    correlationId,
    eventType: eventTypeForOperation(result),
    actor: {
      type: actor.type,
      id: actor.id
    },
    target: {
      type: "STAFF_MEMBER",
      id: result.member.memberId
    },
    source: `discord:/staff ${result.kind === "PROMOTE" ? "promote" : "demote"}`,
    severity: result.status === "BLOCKED" ? "NOTICE" : "INFO",
    metadata: {
      status: result.status,
      fromPositionKey: result.fromPosition?.key,
      toPositionKey: result.toPosition?.key,
      blockReason: result.blockReason,
      seniorSeatHolderId: result.seniorSeatHolder?.memberId,
      pendingExternalSync: result.pendingExternalSync,
      policyMatchedBy: policyResult.matchedBy
    }
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
  action: (typeof ALKA_PERMISSIONS)[keyof typeof ALKA_PERMISSIONS],
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
      action,
      reason: policyResult.reason
    }
  });
}

function actionForSubcommand(subcommand: string): (typeof ALKA_PERMISSIONS)[keyof typeof ALKA_PERMISSIONS] {
  if (subcommand === "promote") {
    return ALKA_PERMISSIONS.STAFF_PROMOTE;
  }

  if (subcommand === "demote") {
    return ALKA_PERMISSIONS.STAFF_DEMOTE;
  }

  if (subcommand === "sync") {
    return ALKA_PERMISSIONS.STAFF_SYNC;
  }

  return ALKA_PERMISSIONS.STAFF_READ;
}

function messageForDeniedAction(action: (typeof ALKA_PERMISSIONS)[keyof typeof ALKA_PERMISSIONS]): string {
  if (action === ALKA_PERMISSIONS.STAFF_PROMOTE || action === ALKA_PERMISSIONS.STAFF_DEMOTE) {
    return "Voce nao tem permissao para alterar carreira da staff.";
  }

  if (action === ALKA_PERMISSIONS.STAFF_SYNC) {
    return "Voce nao tem permissao para reconciliar cargos da staff.";
  }

  return "Voce nao tem permissao para ver o painel de staff.";
}

function operationInputFromInteraction(interaction: ChatInputCommandInteraction, actorDiscordUserId: string) {
  return {
    memberId: interaction.options.getString("id", true),
    actorDiscordUserId,
    reason: interaction.options.getString("motivo", true),
    confirmed: interaction.options.getBoolean("confirmar", false) ?? false
  };
}

function eventTypeForOperation(result: StaffOperationResult): string {
  const prefix = result.kind === "PROMOTE" ? "STAFF_PROMOTION" : "STAFF_DEMOTION";
  switch (result.status) {
    case "APPLIED":
      return result.kind === "PROMOTE" ? "STAFF_PROMOTED" : "STAFF_DEMOTED";
    case "BLOCKED":
      return `${prefix}_BLOCKED`;
    case "PREVIEW":
      return `${prefix}_PREVIEWED`;
  }
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
