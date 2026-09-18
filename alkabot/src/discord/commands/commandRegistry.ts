import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { createNetworkStatusCommand, createNetworkStatusRefreshButton, networkStatusCommandData } from "./networkStatusCommand.js";

export type DiscordCommandSet = {
  chatInputCommands: ChatInputCommandHandler[];
  buttonHandlers: ButtonInteractionHandler[];
};

export function createDiscordCommandSet(registry: ServerRegistry): DiscordCommandSet {
  return {
    chatInputCommands: [createNetworkStatusCommand(registry)],
    buttonHandlers: [createNetworkStatusRefreshButton(registry)]
  };
}

export function createApplicationCommandPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [networkStatusCommandData.toJSON()];
}
