import type { RowDataPacket } from "mysql2/promise";
import type { ImportedRoleRecord, RolePlanAction, RoleSetupStore } from "../../application/roles/rolePlannerTypes.js";
import type { DatabaseProvider } from "./databaseProvider.js";

type ImportedRoleRow = RowDataPacket & {
  role_key: string;
  discord_role_id: string | null;
  status: ImportedRoleRecord["status"];
};

export class RoleSetupRepository implements RoleSetupStore {
  public constructor(private readonly database: DatabaseProvider) {}

  public async listImportedRoles(): Promise<ImportedRoleRecord[]> {
    const [rows] = await this.database
      .getPool()
      .query<ImportedRoleRow[]>("SELECT role_key, discord_role_id, status FROM discord_role_blueprints");

    return rows.map((row) => {
      const record: ImportedRoleRecord = {
        roleKey: row.role_key,
        status: row.status
      };

      if (row.discord_role_id != null) {
        record.discordRoleId = row.discord_role_id;
      }

      return record;
    });
  }

  public async upsertImportedRoles(actions: readonly RolePlanAction[], status: ImportedRoleRecord["status"]): Promise<number> {
    if (actions.length === 0) {
      return 0;
    }

    const values = actions.map((action) => [
      action.blueprint.key,
      action.blueprint.mode,
      action.blueprint.name,
      action.blueprint.colorHex,
      action.blueprint.hoist,
      action.blueprint.mentionable,
      action.blueprint.group,
      action.blueprint.priority,
      action.discordRoleId ?? null,
      status,
      status === "APPLIED" ? new Date() : null
    ]);

    await this.database.getPool().query(
      `
        INSERT INTO discord_role_blueprints (
          role_key, mode, display_name, color_hex, hoist, mentionable, role_group,
          priority, discord_role_id, status, applied_at
        )
        VALUES ?
        ON DUPLICATE KEY UPDATE
          mode = VALUES(mode),
          display_name = VALUES(display_name),
          color_hex = VALUES(color_hex),
          hoist = VALUES(hoist),
          mentionable = VALUES(mentionable),
          role_group = VALUES(role_group),
          priority = VALUES(priority),
          discord_role_id = COALESCE(VALUES(discord_role_id), discord_role_id),
          status = VALUES(status),
          applied_at = COALESCE(VALUES(applied_at), applied_at),
          updated_at = CURRENT_TIMESTAMP(3)
      `,
      [values]
    );

    return actions.length;
  }

  public async insertApplyRun(input: {
    runId: string;
    correlationId: string;
    mode: string;
    actorType: string;
    actorId: string;
    status: "IMPORTED" | "APPLIED";
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.database.getPool().execute(
      `
        INSERT INTO setup_role_apply_runs (
          run_id, correlation_id, mode, actor_type, actor_id, status, metadata_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [input.runId, input.correlationId, input.mode, input.actorType, input.actorId, input.status, JSON.stringify(input.metadata)]
    );
  }
}
