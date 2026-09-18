import type { CapabilitiesPayload, HeartbeatPayload } from "../../contracts/envelopes.js";
import type { DatabaseProvider } from "./databaseProvider.js";

export class ServerNodeRepository {
  public constructor(private readonly database: DatabaseProvider) {}

  public async upsertHeartbeat(payload: HeartbeatPayload): Promise<void> {
    await this.database.getPool().execute(
      `
        INSERT INTO server_nodes (
          server_id, display_name, environment, status, bridge_version, paper_version,
          java_version, last_heartbeat_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          display_name = VALUES(display_name),
          environment = VALUES(environment),
          status = VALUES(status),
          bridge_version = VALUES(bridge_version),
          paper_version = VALUES(paper_version),
          java_version = VALUES(java_version),
          last_heartbeat_at = VALUES(last_heartbeat_at),
          updated_at = CURRENT_TIMESTAMP(3)
      `,
      [
        payload.serverId,
        payload.displayName,
        payload.environment,
        payload.status,
        payload.bridgeVersion,
        payload.paperVersion,
        payload.javaVersion,
        new Date(payload.timestamp)
      ]
    );
  }

  public async upsertCapabilities(payload: CapabilitiesPayload): Promise<void> {
    await this.database.getPool().execute(
      `
        UPDATE server_nodes
        SET capabilities_json = ?, updated_at = CURRENT_TIMESTAMP(3)
        WHERE server_id = ?
      `,
      [JSON.stringify(payload.capabilities), payload.serverId]
    );
  }
}

