import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";

export type SlashCommandData = {
  readonly name: string;
  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
};

export type ChatInputCommandHandler = {
  data: SlashCommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

export type ButtonInteractionHandler = {
  customId: string;
  execute(interaction: ButtonInteraction): Promise<void>;
};
