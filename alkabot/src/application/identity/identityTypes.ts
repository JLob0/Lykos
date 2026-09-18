export type LinkSource = "MINECRAFT_CODE" | "DISCORD_CODE";

export type LinkedIdentity = {
  identityId: string;
  discordUserId: string;
  minecraftUuid: string;
  minecraftName?: string;
  linkedAt: Date;
};

export type LinkCodeRecord = {
  codeId: string;
  codeHash: string;
  minecraftUuid: string;
  minecraftName?: string;
  requestedByServerId?: string;
  expiresAt: Date;
  consumedAt?: Date;
  consumedByDiscordId?: string;
  createdAt: Date;
};

export type CreateLinkCodeInput = {
  minecraftUuid: string;
  minecraftName?: string;
  serverId?: string;
  now?: Date;
};

export type CreatedLinkCode = {
  code: string;
  expiresAt: Date;
  minecraftUuid: string;
  minecraftName?: string;
};

export type ClaimLinkCodeInput = {
  code: string;
  discordUserId: string;
  discordUsername?: string;
  discordGlobalName?: string;
  now?: Date;
};

export type UnlinkInput = {
  discordUserId: string;
  now?: Date;
};

export type CreateLinkCodeRecordInput = {
  codeId: string;
  codeHash: string;
  minecraftUuid: string;
  minecraftName?: string;
  requestedByServerId?: string;
  expiresAt: Date;
  createdAt: Date;
};

export type ConsumeLinkCodeInput = {
  code: LinkCodeRecord;
  identityId: string;
  discordUserId: string;
  discordUsername?: string;
  discordGlobalName?: string;
  now: Date;
  source: LinkSource;
};

export interface IdentityLinkStore {
  findActiveLinkByDiscord(discordUserId: string): Promise<LinkedIdentity | undefined>;
  findActiveLinkByMinecraft(minecraftUuid: string): Promise<LinkedIdentity | undefined>;
  countRecentCodesForMinecraft(minecraftUuid: string, since: Date): Promise<number>;
  createLinkCode(input: CreateLinkCodeRecordInput): Promise<void>;
  findLinkCodeByHash(codeHash: string): Promise<LinkCodeRecord | undefined>;
  consumeLinkCodeAndLink(input: ConsumeLinkCodeInput): Promise<LinkedIdentity>;
  unlinkDiscord(input: { discordUserId: string; now: Date }): Promise<LinkedIdentity | undefined>;
}

export type IdentityLinkErrorCode =
  | "INVALID_CODE"
  | "EXPIRED_CODE"
  | "CODE_ALREADY_USED"
  | "DISCORD_ALREADY_LINKED"
  | "MINECRAFT_ALREADY_LINKED"
  | "RATE_LIMITED"
  | "NOT_LINKED";

export class IdentityLinkError extends Error {
  public constructor(
    public readonly code: IdentityLinkErrorCode,
    message: string
  ) {
    super(message);
  }
}
