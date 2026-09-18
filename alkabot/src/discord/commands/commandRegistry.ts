import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { AuditService } from "../../application/audit/auditService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { createNetworkStatusCommand, createNetworkStatusRefreshButton, networkStatusCommandData } from "./networkStatusCommand.js";

export type DiscordCommandSet = {
  chatInputCommands: ChatInputCommandHandler[];
  buttonHandlers: ButtonInteractionHandler[];
};

export type DiscordCommandSetDependencies = {
  registry: ServerRegistry;
  policyEngine: PolicyEngine;
  auditService: AuditService;
};

export function createDiscordCommandSet(dependencies: DiscordCommandSetDependencies): DiscordCommandSet {
  return {
    chatInputCommands: [createNetworkStatusCommand(dependencies)],
    buttonHandlers: [createNetworkStatusRefreshButton(dependencies)]
  };
}

export function createApplicationCommandPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [networkStatusCommandData.toJSON()];
}
