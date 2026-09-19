import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";
import type { AuditService } from "../../application/audit/auditService.js";
import type { IdentityLinkService } from "../../application/identity/identityLinkService.js";
import type { PolicyEngine } from "../../application/policy/policyEngine.js";
import type { ProfileAggregationService } from "../../application/profile/profileAggregationService.js";
import type { RoleSetupService } from "../../application/roles/roleSetupService.js";
import type { SetupService } from "../../application/setup/setupService.js";
import type { StaffDirectoryService } from "../../application/staff/staffDirectoryService.js";
import type { StaffOperationsService } from "../../application/staff/staffOperationsService.js";
import type { StaffSyncService } from "../../application/staff/staffSyncService.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import type { ButtonInteractionHandler, ChatInputCommandHandler } from "../interactions/slashCommand.js";
import { createLinkCommand, createUnlinkCommand, linkCommandData, unlinkCommandData } from "./identityCommands.js";
import { createNetworkStatusCommand, createNetworkStatusRefreshButton, networkStatusCommandData } from "./networkStatusCommand.js";
import { createProfileCommand, profileCommandData } from "./profileCommand.js";
import { createSetupCommand, setupCommandData } from "./setupCommand.js";
import { createStaffCommand, staffCommandData } from "./staffCommand.js";

export type DiscordCommandSet = {
  chatInputCommands: ChatInputCommandHandler[];
  buttonHandlers: ButtonInteractionHandler[];
};

export type DiscordCommandSetDependencies = {
  registry: ServerRegistry;
  policyEngine: PolicyEngine;
  auditService: AuditService;
  identityLinkService: IdentityLinkService;
  profileService: ProfileAggregationService;
  setupService: SetupService;
  roleSetupService: RoleSetupService;
  staffDirectoryService: StaffDirectoryService;
  staffOperationsService: StaffOperationsService;
  staffSyncService: StaffSyncService;
};

export function createDiscordCommandSet(dependencies: DiscordCommandSetDependencies): DiscordCommandSet {
  return {
    chatInputCommands: [
      createNetworkStatusCommand(dependencies),
      createSetupCommand(dependencies),
      createLinkCommand(dependencies),
      createUnlinkCommand(dependencies),
      createProfileCommand(dependencies),
      createStaffCommand(dependencies)
    ],
    buttonHandlers: [createNetworkStatusRefreshButton(dependencies)]
  };
}

export function createApplicationCommandPayloads(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [
    networkStatusCommandData.toJSON(),
    setupCommandData.toJSON(),
    linkCommandData.toJSON(),
    unlinkCommandData.toJSON(),
    profileCommandData.toJSON(),
    staffCommandData.toJSON()
  ];
}
