import type { IdentityLinkService } from "../identity/identityLinkService.js";
import type {
  OwnProfileLookupInput,
  PlayerProfileSnapshot,
  ProfileLookupInput,
  ProfileProvider,
  ProfileProviderContribution,
  ProfileSourceStatus
} from "./profileTypes.js";
import { ProfileError } from "./profileTypes.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export class ProfileAggregationService {
  public constructor(
    private readonly identityLinkService: IdentityLinkService,
    private readonly providers: ProfileProvider[]
  ) {}

  public async getOwnProfile(input: OwnProfileLookupInput): Promise<PlayerProfileSnapshot> {
    const identity = await this.identityLinkService.getLinkedIdentity(input.discordUserId);
    if (identity == null) {
      throw new ProfileError("IDENTITY_NOT_LINKED", "Sua conta Discord ainda nao esta vinculada a uma conta Minecraft.");
    }

    return this.getProfileByMinecraftUuid({
      minecraftUuid: identity.minecraftUuid,
      requesterDiscordUserId: input.discordUserId,
      ...(input.now == null ? {} : { now: input.now })
    });
  }

  public async getProfileByMinecraftUuid(input: ProfileLookupInput): Promise<PlayerProfileSnapshot> {
    const minecraftUuid = normalizeUuid(input.minecraftUuid);
    if (!UUID_PATTERN.test(minecraftUuid)) {
      throw new ProfileError("INVALID_MINECRAFT_UUID", "UUID Minecraft invalido.");
    }

    const now = input.now ?? new Date();
    const snapshot: PlayerProfileSnapshot = {
      minecraftUuid,
      privacy: "PUBLIC",
      generatedAt: now,
      sources: []
    };

    for (const provider of this.providers) {
      try {
        const contribution = await provider.snapshot({
          minecraftUuid,
          now,
          ...(input.requesterDiscordUserId == null ? {} : { requesterDiscordUserId: input.requesterDiscordUserId })
        });
        if (contribution == null) {
          snapshot.sources.push({ source: provider.id, state: "MISSING" });
          continue;
        }

        mergeContribution(snapshot, contribution);
        snapshot.sources.push(...(contribution.sources ?? [{ source: provider.id, state: "AVAILABLE" }]));
      } catch (error) {
        snapshot.sources.push({
          source: provider.id,
          state: "ERROR",
          detail: error instanceof Error ? error.message : "Provider failure."
        });
      }
    }

    return snapshot;
  }
}

function mergeContribution(snapshot: PlayerProfileSnapshot, contribution: ProfileProviderContribution): void {
  assignIfDefined(snapshot, "nickname", contribution.nickname);
  assignIfDefined(snapshot, "rank", contribution.rank);
  assignIfDefined(snapshot, "prestige", contribution.prestige);
  assignIfDefined(snapshot, "vip", contribution.vip);
  assignIfDefined(snapshot, "clan", contribution.clan);
  assignIfDefined(snapshot, "onlineTime", contribution.onlineTime);
  assignIfDefined(snapshot, "coins", contribution.coins);
  assignIfDefined(snapshot, "level", contribution.level);
  assignIfDefined(snapshot, "serverId", contribution.serverId);
  assignIfDefined(snapshot, "registeredAt", contribution.registeredAt);
  assignIfDefined(snapshot, "staff", contribution.staff);
  assignIfDefined(snapshot, "linkedDiscordUserId", contribution.linkedDiscordUserId);
  assignIfDefined(snapshot, "linkedAt", contribution.linkedAt);
  assignIfDefined(snapshot, "stats", contribution.stats);
  assignIfDefined(snapshot, "privacy", contribution.privacy);
}

function assignIfDefined<Key extends keyof PlayerProfileSnapshot>(
  snapshot: PlayerProfileSnapshot,
  key: Key,
  value: PlayerProfileSnapshot[Key] | undefined
): void {
  if (value !== undefined) {
    snapshot[key] = value;
  }
}

export function profileSource(source: string, state: ProfileSourceStatus["state"], detail?: string): ProfileSourceStatus {
  return {
    source,
    state,
    ...(detail == null ? {} : { detail })
  };
}

function normalizeUuid(uuid: string): string {
  return uuid.trim().toLowerCase();
}
