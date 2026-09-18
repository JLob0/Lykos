import { MessageFlags, SlashCommandBuilder, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";
import type { AuditService } from "../../application/audit/auditService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import { ALKA_PERMISSIONS, type PolicyActor, type PolicyResult } from "../../application/policy/policyTypes.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import { createDiscordPolicyActor } from "../permissions/discordPolicyActor.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { NETWORK_STATUS_REFRESH_ID, renderNetworkStatusCard } from "../ui/networkStatusCard.js";

export const networkStatusCommandData = new SlashCommandBuilder()
  .setName("network")
  .setDescription("Operacoes e diagnosticos da Network Alka.")
  .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Mostra o status dos servidores conectados ao Lykos."));

export type NetworkStatusCommandDependencies = {
  registry: ServerRegistry;
  policyEngine: PolicyEngine;
  auditService: AuditService;
};

export function createNetworkStatusCommand(dependencies: NetworkStatusCommandDependencies): ChatInputCommandHandler {
  return {
    data: networkStatusCommandData,
    async execute(interaction: ChatInputCommandInteraction) {
      const subcommand = interaction.options.getSubcommand();
      if (subcommand !== "status") {
        await interaction.reply({
          content: "Subcomando desconhecido para /network.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const actor = actorFromInteraction(interaction);
      const policyResult = authorizeNetworkRead(dependencies.policyEngine, actor, "discord:/network status");
      if (!policyResult.allowed) {
        await auditPolicyDenied(dependencies.auditService, interaction.id, actor, policyResult, "discord:/network status");
        await interaction.reply({
          content: "Voce nao tem permissao para ver o status da Network.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const servers = dependencies.registry.list();
      await dependencies.auditService.record({
        correlationId: interaction.id,
        eventType: "NETWORK_STATUS_VIEWED",
        actor: {
          type: "DISCORD_USER",
          id: interaction.user.id
        },
        target: {
          type: "NETWORK",
          id: "global"
        },
        source: "discord:/network status",
        metadata: {
          serverCount: servers.length,
          totalPlayers: servers.reduce((total, server) => total + server.onlinePlayers, 0),
          policyMatchedBy: policyResult.matchedBy
        }
      });

      await interaction.reply(renderNetworkStatusCard(servers));
    }
  };
}

export function createNetworkStatusRefreshButton(dependencies: NetworkStatusCommandDependencies): ButtonInteractionHandler {
  return {
    customId: NETWORK_STATUS_REFRESH_ID,
    async execute(interaction: ButtonInteraction) {
      const actor = actorFromInteraction(interaction);
      const policyResult = authorizeNetworkRead(dependencies.policyEngine, actor, "discord:button:network-status-refresh");
      if (!policyResult.allowed) {
        await auditPolicyDenied(dependencies.auditService, interaction.id, actor, policyResult, "discord:button:network-status-refresh");
        await interaction.reply({
          content: "Voce nao tem permissao para atualizar o status da Network.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const servers = dependencies.registry.list();
      await dependencies.auditService.record({
        correlationId: interaction.id,
        eventType: "NETWORK_STATUS_REFRESHED",
        actor: {
          type: "DISCORD_USER",
          id: interaction.user.id
        },
        target: {
          type: "NETWORK",
          id: "global"
        },
        source: "discord:button:network-status-refresh",
        metadata: {
          serverCount: servers.length,
          policyMatchedBy: policyResult.matchedBy
        }
      });

      await interaction.update(renderNetworkStatusCard(servers));
    }
  };
}

function authorizeNetworkRead(policyEngine: PolicyEngine, actor: PolicyActor, source: string): PolicyResult {
  return policyEngine.evaluate({
    action: ALKA_PERMISSIONS.NETWORK_READ,
    actor,
    resourceType: "NETWORK",
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
      type: "NETWORK",
      id: "global"
    },
    source,
    severity: "WARNING",
    metadata: {
      action: ALKA_PERMISSIONS.NETWORK_READ,
      reason: policyResult.reason
    }
  });
}

function actorFromInteraction(interaction: ChatInputCommandInteraction | ButtonInteraction): PolicyActor {
  return createDiscordPolicyActor({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    guildOwnerId: interaction.guild?.ownerId,
    member: interaction.member
  });
}
