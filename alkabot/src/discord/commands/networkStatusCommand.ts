import { MessageFlags, SlashCommandBuilder, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { NETWORK_STATUS_REFRESH_ID, renderNetworkStatusCard } from "../ui/networkStatusCard.js";

export const networkStatusCommandData = new SlashCommandBuilder()
  .setName("network")
  .setDescription("Operacoes e diagnosticos da Network Alka.")
  .addSubcommand((subcommand) => subcommand.setName("status").setDescription("Mostra o status dos servidores conectados ao Lykos."));

export function createNetworkStatusCommand(registry: ServerRegistry): ChatInputCommandHandler {
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

      await interaction.reply(renderNetworkStatusCard(registry.list()));
    }
  };
}

export function createNetworkStatusRefreshButton(registry: ServerRegistry): ButtonInteractionHandler {
  return {
    customId: NETWORK_STATUS_REFRESH_ID,
    async execute(interaction: ButtonInteraction) {
      await interaction.update(renderNetworkStatusCard(registry.list()));
    }
  };
}
