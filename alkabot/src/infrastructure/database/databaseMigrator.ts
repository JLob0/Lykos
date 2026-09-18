import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AppLogger } from "../../logging/logger.js";
import type { DatabaseProvider } from "./databaseProvider.js";

type MigrationRow = RowDataPacket & {
  version: string;
};

export class DatabaseMigrator {
  public constructor(
    private readonly database: DatabaseProvider,
    private readonly logger: AppLogger
  ) {}

  public async run(migrationsDirectory: string): Promise<void> {
    const connection = await this.database.getPool().getConnection();

    try {
      await connection.beginTransaction();
      await this.ensureMigrationTable(connection);

      const applied = await this.getAppliedVersions(connection);
      const migrationFiles = await this.getMigrationFiles(migrationsDirectory);

      for (const migrationFile of migrationFiles) {
        const version = basename(migrationFile, ".sql");
        if (applied.has(version)) {
          continue;
        }

        const sql = await readFile(join(migrationsDirectory, migrationFile), "utf8");
        await connection.query(sql);
        await connection.query("INSERT INTO alka_schema_migrations (version, applied_at) VALUES (?, CURRENT_TIMESTAMP(3))", [version]);
        this.logger.info({ version }, "Database migration applied.");
      }

      await connection.commit();
    } catch (error) {
      await rollbackQuietly(connection, this.logger);
      throw error;
    } finally {
      connection.release();
    }
  }

  private async ensureMigrationTable(connection: PoolConnection): Promise<void> {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS alka_schema_migrations (
        version VARCHAR(191) PRIMARY KEY,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      )
    `);
  }

  private async getAppliedVersions(connection: PoolConnection): Promise<Set<string>> {
    const [rows] = await connection.query<MigrationRow[]>("SELECT version FROM alka_schema_migrations");
    return new Set(rows.map((row) => row.version));
  }

  private async getMigrationFiles(migrationsDirectory: string): Promise<string[]> {
    const entries = await readdir(migrationsDirectory);
    return entries.filter((entry) => entry.endsWith(".sql")).sort((left, right) => left.localeCompare(right));
  }
}

async function rollbackQuietly(connection: PoolConnection, logger: AppLogger): Promise<void> {
  try {
    await connection.rollback();
  } catch (rollbackError) {
    logger.error({ rollbackError }, "Database migration rollback failed.");
  }
}

