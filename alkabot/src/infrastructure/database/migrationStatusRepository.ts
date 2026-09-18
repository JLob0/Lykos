import type { RowDataPacket } from "mysql2/promise";
import type { MigrationStatusReader } from "../../application/setup/setupTypes.js";
import type { DatabaseProvider } from "./databaseProvider.js";

type MigrationRow = RowDataPacket & {
  version: string;
};

export class MigrationStatusRepository implements MigrationStatusReader {
  public constructor(private readonly database: DatabaseProvider) {}

  public async listAppliedVersions(): Promise<ReadonlySet<string>> {
    const [rows] = await this.database.getPool().query<MigrationRow[]>("SELECT version FROM alka_schema_migrations");
    return new Set(rows.map((row) => row.version));
  }
}
