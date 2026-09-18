import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  ConsumeLinkCodeInput,
  CreateLinkCodeRecordInput,
  IdentityLinkStore,
  LinkCodeRecord,
  LinkedIdentity
} from "../../application/identity/identityTypes.js";
import { IdentityLinkError } from "../../application/identity/identityTypes.js";
import type { DatabaseProvider } from "./databaseProvider.js";

type LinkedIdentityRow = RowDataPacket & {
  identity_id: string;
  discord_user_id: string;
  minecraft_uuid: string;
  last_known_name: string | null;
  linked_at: Date;
};

type LinkCodeRow = RowDataPacket & {
  code_id: string;
  code_hash: string;
  minecraft_uuid: string;
  minecraft_name: string | null;
  requested_by_server_id: string | null;
  expires_at: Date;
  consumed_at: Date | null;
  consumed_by_discord_id: string | null;
  created_at: Date;
};

type CountRow = RowDataPacket & {
  total: number;
};

export class IdentityLinkRepository implements IdentityLinkStore {
  public constructor(private readonly database: DatabaseProvider) {}

  public async findActiveLinkByDiscord(discordUserId: string): Promise<LinkedIdentity | undefined> {
    const [rows] = await this.database.getPool().execute<LinkedIdentityRow[]>(
      `
        SELECT li.identity_id, li.discord_user_id, li.minecraft_uuid, ma.last_known_name, li.linked_at
        FROM linked_identities li
        JOIN minecraft_accounts ma ON ma.minecraft_uuid = li.minecraft_uuid
        WHERE li.discord_user_id = ? AND li.status = 'ACTIVE'
        LIMIT 1
      `,
      [discordUserId]
    );

    return rows[0] == null ? undefined : toLinkedIdentity(rows[0]);
  }

  public async findActiveLinkByMinecraft(minecraftUuid: string): Promise<LinkedIdentity | undefined> {
    const [rows] = await this.database.getPool().execute<LinkedIdentityRow[]>(
      `
        SELECT li.identity_id, li.discord_user_id, li.minecraft_uuid, ma.last_known_name, li.linked_at
        FROM linked_identities li
        JOIN minecraft_accounts ma ON ma.minecraft_uuid = li.minecraft_uuid
        WHERE li.minecraft_uuid = ? AND li.status = 'ACTIVE'
        LIMIT 1
      `,
      [minecraftUuid]
    );

    return rows[0] == null ? undefined : toLinkedIdentity(rows[0]);
  }

  public async countRecentCodesForMinecraft(minecraftUuid: string, since: Date): Promise<number> {
    const [rows] = await this.database.getPool().execute<CountRow[]>(
      "SELECT COUNT(*) AS total FROM link_codes WHERE minecraft_uuid = ? AND created_at >= ? AND consumed_at IS NULL",
      [minecraftUuid, since]
    );

    return rows[0]?.total ?? 0;
  }

  public async createLinkCode(input: CreateLinkCodeRecordInput): Promise<void> {
    await this.database.getPool().execute(
      `
        INSERT INTO link_codes (
          code_id, code_hash, minecraft_uuid, minecraft_name, requested_by_server_id, expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.codeId,
        input.codeHash,
        input.minecraftUuid,
        input.minecraftName ?? null,
        input.requestedByServerId ?? null,
        input.expiresAt,
        input.createdAt
      ]
    );
  }

  public async findLinkCodeByHash(codeHash: string): Promise<LinkCodeRecord | undefined> {
    const [rows] = await this.database.getPool().execute<LinkCodeRow[]>(
      `
        SELECT code_id, code_hash, minecraft_uuid, minecraft_name, requested_by_server_id,
               expires_at, consumed_at, consumed_by_discord_id, created_at
        FROM link_codes
        WHERE code_hash = ?
        LIMIT 1
      `,
      [codeHash]
    );

    return rows[0] == null ? undefined : toLinkCodeRecord(rows[0]);
  }

  public async consumeLinkCodeAndLink(input: ConsumeLinkCodeInput): Promise<LinkedIdentity> {
    const connection = await this.database.getPool().getConnection();

    try {
      await connection.beginTransaction();
      const [consumeResult] = await connection.execute<ResultSetHeader>(
        "UPDATE link_codes SET consumed_at = ?, consumed_by_discord_id = ? WHERE code_id = ? AND consumed_at IS NULL",
        [input.now, input.discordUserId, input.code.codeId]
      );
      if (consumeResult.affectedRows !== 1) {
        throw new IdentityLinkError("CODE_ALREADY_USED", "Codigo de vinculacao ja usado.");
      }

      await upsertDiscordAccount(connection, input);
      await upsertMinecraftAccount(connection, input);
      await connection.execute(
        `
          INSERT INTO linked_identities (
            identity_id, discord_user_id, minecraft_uuid, status, source, linked_at
          )
          VALUES (?, ?, ?, 'ACTIVE', ?, ?)
        `,
        [input.identityId, input.discordUserId, input.code.minecraftUuid, input.source, input.now]
      );
      await connection.commit();

      return {
        identityId: input.identityId,
        discordUserId: input.discordUserId,
        minecraftUuid: input.code.minecraftUuid,
        ...(input.code.minecraftName == null ? {} : { minecraftName: input.code.minecraftName }),
        linkedAt: input.now
      };
    } catch (error) {
      await rollbackQuietly(connection);
      throw error;
    } finally {
      connection.release();
    }
  }

  public async unlinkDiscord(input: { discordUserId: string; now: Date }): Promise<LinkedIdentity | undefined> {
    const identity = await this.findActiveLinkByDiscord(input.discordUserId);
    if (identity == null) {
      return undefined;
    }

    await this.database.getPool().execute(
      "UPDATE linked_identities SET status = 'UNLINKED', unlinked_at = ? WHERE identity_id = ? AND status = 'ACTIVE'",
      [input.now, identity.identityId]
    );

    return identity;
  }
}

async function upsertDiscordAccount(connection: PoolConnection, input: ConsumeLinkCodeInput): Promise<void> {
  await connection.execute(
    `
      INSERT INTO discord_accounts (discord_user_id, username, global_name)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        global_name = VALUES(global_name),
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [input.discordUserId, input.discordUsername ?? null, input.discordGlobalName ?? null]
  );
}

async function upsertMinecraftAccount(connection: PoolConnection, input: ConsumeLinkCodeInput): Promise<void> {
  await connection.execute(
    `
      INSERT INTO minecraft_accounts (minecraft_uuid, last_known_name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        last_known_name = COALESCE(VALUES(last_known_name), last_known_name),
        updated_at = CURRENT_TIMESTAMP(3)
    `,
    [input.code.minecraftUuid, input.code.minecraftName ?? null]
  );
}

async function rollbackQuietly(connection: PoolConnection): Promise<void> {
  try {
    await connection.rollback();
  } catch {
    // Nothing useful to do here; original transaction error is more important.
  }
}

function toLinkedIdentity(row: LinkedIdentityRow): LinkedIdentity {
  return {
    identityId: row.identity_id,
    discordUserId: row.discord_user_id,
    minecraftUuid: row.minecraft_uuid,
    ...(row.last_known_name == null ? {} : { minecraftName: row.last_known_name }),
    linkedAt: row.linked_at
  };
}

function toLinkCodeRecord(row: LinkCodeRow): LinkCodeRecord {
  return {
    codeId: row.code_id,
    codeHash: row.code_hash,
    minecraftUuid: row.minecraft_uuid,
    ...(row.minecraft_name == null ? {} : { minecraftName: row.minecraft_name }),
    ...(row.requested_by_server_id == null ? {} : { requestedByServerId: row.requested_by_server_id }),
    expiresAt: row.expires_at,
    ...(row.consumed_at == null ? {} : { consumedAt: row.consumed_at }),
    ...(row.consumed_by_discord_id == null ? {} : { consumedByDiscordId: row.consumed_by_discord_id }),
    createdAt: row.created_at
  };
}
