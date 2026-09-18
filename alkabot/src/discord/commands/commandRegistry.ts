import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { AuditService } from "../../application/audit/auditService.js";
import type { IdentityLinkService } from "../../application/identity/identityLinkService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import type { RoleSetupService } from "../../application/roles/roleSetupService.js";
import type { SetupService } from "../../application/setup/setupService.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { createLinkCommand, createUnlinkCommand, linkCommandData, unlinkCommandData } from "./identityCommands.js";
import { createNetworkStatusCommand, createNetworkStatusRefreshButton, networkStatusCommandData } from "./networkStatusCommand.js";
import { createSetupCommand, setupCommandData } from "./setupCommand.js";

export type DiscordCommandSet = {
  chatInputCommands: ChatInputCommandHandler[];
  buttonHandlers: ButtonInteractionHandler[];
};

export type DiscordCommandSetDependencies = {
  registry: ServerRegistry;
  policyEngine: PolicyEngine;
  auditService: AuditService;
  identityLinkService: IdentityLinkService;
  setupService: SetupService;
  roleSetupService: RoleSetupService;
};

export function createDiscordCommandSet(dependencies: DiscordCommandSetDependencies): DiscordCommandSet {
  return {
    chatInputCommands: [
      createNetworkStatusCommand(dependencies),
      createSetupCommand(dependencies),
      createLinkCommand(dependencies),
      createUnlinkCommand(dependencies)
    ],
    buttonHandlers: [createNetworkStatusRefreshButton(dependencies)]
  };
}

export function createApplicationCommandPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [networkStatusCommandData.toJSON(), setupCommandData.toJSON(), linkCommandData.toJSON(), unlinkCommandData.toJSON()];
}
