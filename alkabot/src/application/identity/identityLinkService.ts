import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  ClaimLinkCodeInput,
  CreatedLinkCode,
  CreateLinkCodeInput,
  IdentityLinkStore,
  LinkedIdentity,
  UnlinkInput
} from "./identityTypes.js";
import { IdentityLinkError } from "./identityTypes.js";

const CODE_PREFIX = "ALKA";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export type IdentityLinkServiceOptions = {
  codeTtlMs: number;
  rateLimitMs: number;
};

export class IdentityLinkService {
  public constructor(
    private readonly store: IdentityLinkStore,
    private readonly options: IdentityLinkServiceOptions
  ) {}

  public async createMinecraftLinkCode(input: CreateLinkCodeInput): Promise<CreatedLinkCode> {
    const now = input.now ?? new Date();
    const minecraftUuid = normalizeUuid(input.minecraftUuid);
    const minecraftName = normalizeOptionalName(input.minecraftName);
    const requestedByServerId = normalizeOptional(input.serverId);
    if (!UUID_PATTERN.test(minecraftUuid)) {
      throw new IdentityLinkError("INVALID_CODE", "Minecraft UUID invalido.");
    }

    const existingLink = await this.store.findActiveLinkByMinecraft(minecraftUuid);
    if (existingLink != null) {
      throw new IdentityLinkError("MINECRAFT_ALREADY_LINKED", "Esta conta Minecraft ja esta vinculada.");
    }

    const since = new Date(now.getTime() - this.options.rateLimitMs);
    const recentCodes = await this.store.countRecentCodesForMinecraft(minecraftUuid, since);
    if (recentCodes > 0) {
      throw new IdentityLinkError("RATE_LIMITED", "Aguarde antes de gerar outro codigo de vinculacao.");
    }

    const code = generateCode();
    const expiresAt = new Date(now.getTime() + this.options.codeTtlMs);
    await this.store.createLinkCode({
      codeId: `link_code_${randomUUID()}`,
      codeHash: hashCode(code),
      minecraftUuid,
      expiresAt,
      createdAt: now,
      ...(minecraftName == null ? {} : { minecraftName }),
      ...(requestedByServerId == null ? {} : { requestedByServerId })
    });

    return {
      code,
      expiresAt,
      minecraftUuid,
      ...(minecraftName == null ? {} : { minecraftName })
    };
  }

  public async claimLinkCode(input: ClaimLinkCodeInput): Promise<LinkedIdentity> {
    const now = input.now ?? new Date();
    const code = normalizeCode(input.code);
    if (code == null) {
      throw new IdentityLinkError("INVALID_CODE", "Codigo de vinculacao invalido.");
    }

    const linkCode = await this.store.findLinkCodeByHash(hashCode(code));
    if (linkCode == null) {
      throw new IdentityLinkError("INVALID_CODE", "Codigo de vinculacao invalido.");
    }

    if (linkCode.consumedAt != null) {
      throw new IdentityLinkError("CODE_ALREADY_USED", "Codigo de vinculacao ja usado.");
    }

    if (linkCode.expiresAt.getTime() <= now.getTime()) {
      throw new IdentityLinkError("EXPIRED_CODE", "Codigo de vinculacao expirado.");
    }

    const existingDiscordLink = await this.store.findActiveLinkByDiscord(input.discordUserId);
    if (existingDiscordLink != null) {
      throw new IdentityLinkError("DISCORD_ALREADY_LINKED", "Sua conta Discord ja esta vinculada.");
    }

    const existingMinecraftLink = await this.store.findActiveLinkByMinecraft(linkCode.minecraftUuid);
    if (existingMinecraftLink != null) {
      throw new IdentityLinkError("MINECRAFT_ALREADY_LINKED", "Esta conta Minecraft ja esta vinculada.");
    }

    const discordUsername = normalizeOptional(input.discordUsername);
    const discordGlobalName = normalizeOptional(input.discordGlobalName);

    return this.store.consumeLinkCodeAndLink({
      code: linkCode,
      identityId: `identity_${randomUUID()}`,
      discordUserId: input.discordUserId,
      now,
      source: "MINECRAFT_CODE",
      ...(discordUsername == null ? {} : { discordUsername }),
      ...(discordGlobalName == null ? {} : { discordGlobalName })
    });
  }

  public async getLinkedIdentity(discordUserId: string): Promise<LinkedIdentity | undefined> {
    return this.store.findActiveLinkByDiscord(discordUserId);
  }

  public async unlinkDiscord(input: UnlinkInput): Promise<LinkedIdentity> {
    const identity = await this.store.unlinkDiscord({
      discordUserId: input.discordUserId,
      now: input.now ?? new Date()
    });

    if (identity == null) {
      throw new IdentityLinkError("NOT_LINKED", "Sua conta Discord nao esta vinculada.");
    }

    return identity;
  }
}

export function hashCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code) ?? code).digest("hex");
}

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let suffix = "";
  for (const byte of bytes) {
    suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }

  return `${CODE_PREFIX}-${suffix}`;
}

function normalizeCode(code: string): string | undefined {
  const normalized = code.trim().toUpperCase();
  if (!/^ALKA-[A-Z2-9]{5}$/u.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeUuid(uuid: string): string {
  return uuid.trim().toLowerCase();
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeOptionalName(value: string | undefined): string | undefined {
  const normalized = normalizeOptional(value);
  if (normalized == null) {
    return undefined;
  }

  return normalized.slice(0, 16);
}
