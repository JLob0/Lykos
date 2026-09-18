import { MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction, type PermissionsBitField } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type PolicyActor, type PolicyResult } from "../../application/policy/policyTypes.js";
import type { SetupService } from "../../application/setup/setupService.js";
import type { SetupRuntimeContext } from "../../application/setup/setupTypes.js";
import { createDiscordPolicyActor } from "../permissions/discordPolicyActor.js";
import type { ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { renderSetupDoctorCard, renderSetupPlanCard } from "../ui/setupCards.js";

export const setupCommandData = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Diagnosticos e dry-run do setup do Lykos.")
  .addSubcommand((subcommand) => subcommand.setName("doctor").setDescription("Valida configuracao, dependencias e readiness do Lykos."))
  .addSubcommand((subcommand) => subcommand.setName("plan").setDescription("Mostra um dry-run seguro do setup sem aplicar mudancas."));

export type SetupCommandDependencies = {
  setupService: SetupService;
  policyEngine: PolicyEngine;
  auditService: AuditService;
};

export function createSetupCommand(dependencies: SetupCommandDependencies): ChatInputCommandHandler {
  return {
    data: setupCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      const subcommand = interaction.options.getSubcommand();
      const actor = actorFromInteraction(interaction);
      const policyResult = authorizeSetupRead(dependencies.policyEngine, actor, `discord:/setup ${subcommand}`);

      if (!policyResult.allowed) {
        await auditPolicyDenied(dependencies.auditService, interaction.id, actor, policyResult, `discord:/setup ${subcommand}`);
        await interaction.reply({
          content: "Voce nao tem permissao para ver o setup do Lykos.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral
      });

      if (subcommand === "doctor") {
        const report = await dependencies.setupService.runDoctor(contextFromInteraction(interaction));
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_DOCTOR_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP",
            id: "doctor"
          },
          source: "discord:/setup doctor",
          metadata: {
            overall: report.overall,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderSetupDoctorCard(report));
        return;
      }

      if (subcommand === "plan") {
        const report = await dependencies.setupService.createPlan(contextFromInteraction(interaction));
        await dependencies.auditService.record({
          correlationId: interaction.id,
          eventType: "SETUP_PLAN_VIEWED",
          actor: {
            type: "DISCORD_USER",
            id: interaction.user.id
          },
          target: {
            type: "SETUP",
            id: "plan"
          },
          source: "discord:/setup plan",
          metadata: {
            doctorOverall: report.doctorOverall,
            summary: report.summary,
            policyMatchedBy: policyResult.matchedBy
          }
        });
        await interaction.editReply(renderSetupPlanCard(report));
        return;
      }

      await interaction.editReply("Subcomando desconhecido para /setup.");
    }
  };
}

function authorizeSetupRead(policyEngine: PolicyEngine, actor: PolicyActor, source: string): PolicyResult {
  return policyEngine.evaluate({
    action: ALKA_PERMISSIONS.SETUP_READ,
    actor,
    resourceType: "SETUP",
    resourceId: "global",
    source
  });
}

async function auditPolicyDenied(
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
      type: "SETUP",
      id: "global"
    },
    source,
    severity: "WARNING",
    metadata: {
      action: ALKA_PERMISSIONS.SETUP_READ,
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

function contextFromInteraction(interaction: ChatInputCommandInteraction): SetupRuntimeContext {
  const context: SetupRuntimeContext = {
    botPermissionNames: permissionNames(interaction.appPermissions),
    isGuildOwner: interaction.guild?.ownerId === interaction.user.id
  };

  if (interaction.guildId != null) {
    context.guildId = interaction.guildId;
  }

  if (interaction.guild?.name != null) {
    context.guildName = interaction.guild.name;
  }

  return context;
}

function permissionNames(permissions: Readonly<PermissionsBitField> | null): string[] {
  return permissions?.toArray() ?? [];
}
