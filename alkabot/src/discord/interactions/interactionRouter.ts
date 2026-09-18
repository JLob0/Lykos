import { MessageFlags, type ButtonInteraction, type ChatInputCommandInteraction, type Interaction } from "discord.js";
import type { AppLogger } from "../../logging/logger.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "./slashCommand.js";

export class InteractionRouter {
  private readonly chatInputCommands = new Map<string, ChatInputCommandHandler>();
  private readonly buttonHandlers = new Map<string, ButtonInteractionHandler>();

  public constructor(
    commands: ChatInputCommandHandler[],
    buttons: ButtonInteractionHandler[],
    private readonly logger: AppLogger
  ) {
    for (const command of commands) {
      this.chatInputCommands.set(command.data.name, command);
    }

    for (const button of buttons) {
      this.buttonHandlers.set(button.customId, button);
    }
  }

  public async handle(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleChatInput(interaction);
        return;
      }

      if (interaction.isButton()) {
        await this.handleButton(interaction);
      }
    } catch (error) {
      this.logger.error({ error, interactionId: interaction.id }, "Discord interaction handler failed.");
      await respondWithError(interaction, "Nao consegui concluir essa acao. Tente novamente em instantes.");
    }
  }

  private async handleChatInput(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.chatInputCommands.get(interaction.commandName);
    if (command == null) {
      await interaction.reply({
        content: "Comando ainda nao registrado no Lykos.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await command.execute(interaction);
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const handler = this.buttonHandlers.get(interaction.customId);
    if (handler == null) {
      await interaction.reply({
        content: "Este botao expirou ou ainda nao possui handler.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await handler.execute(interaction);
  }
}

async function respondWithError(interaction: Interaction, content: string): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({
      content,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.reply({
    content,
    flags: MessageFlags.Ephemeral
  });
}
