export type ProfilePrivacy = "PUBLIC" | "GUILD_ONLY" | "PRIVATE";

export type ProfileSourceState = "AVAILABLE" | "MISSING" | "ERROR";

export type ProfileSourceStatus = {
  source: string;
  state: ProfileSourceState;
  detail?: string;
};

export type ProfileStats = {
  kills?: number;
  deaths?: number;
  kd?: number;
  blocksBroken?: number;
  playtimeSeconds?: number;
};

export type PlayerProfileSnapshot = {
  minecraftUuid: string;
  nickname?: string;
  rank?: string;
  prestige?: string;
  vip?: string;
  clan?: string;
  onlineTime?: string;
  coins?: string;
  level?: string;
  serverId?: string;
  registeredAt?: Date;
  staff?: string;
  linkedDiscordUserId?: string;
  linkedAt?: Date;
  stats?: ProfileStats;
  privacy: ProfilePrivacy;
  generatedAt: Date;
  sources: ProfileSourceStatus[];
};

export type ProfileProviderContribution = Partial<
  Omit<PlayerProfileSnapshot, "minecraftUuid" | "generatedAt" | "sources">
> & {
  sources?: ProfileSourceStatus[];
};

export type ProfileProviderInput = {
  minecraftUuid: string;
  requesterDiscordUserId?: string;
  now: Date;
};

export interface ProfileProvider {
  readonly id: string;
  snapshot(input: ProfileProviderInput): Promise<ProfileProviderContribution | undefined>;
}

export type ProfileLookupInput = {
  minecraftUuid: string;
  requesterDiscordUserId?: string;
  now?: Date;
};

export type OwnProfileLookupInput = {
  discordUserId: string;
  now?: Date;
};

export type ProfileErrorCode = "INVALID_MINECRAFT_UUID" | "IDENTITY_NOT_LINKED";

export class ProfileError extends Error {
  public constructor(
    public readonly code: ProfileErrorCode,
    message: string
  ) {
    super(message);
  }
}
