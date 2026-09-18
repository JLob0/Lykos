import mysql, { type Pool } from "mysql2/promise";
import type { AppConfig } from "../../config/appConfig.js";
import type { AppLogger } from "../../logging/logger.js";
import type { HealthCheck, HealthCheckResult } from "../../shared/health.js";

export class DatabaseProvider implements HealthCheck {
  public readonly name = "mysql";

  private pool: Pool | undefined;

  public constructor(
    private readonly config: AppConfig,
    private readonly logger: AppLogger
  ) {}

  public getPool(): Pool {
    if (this.pool == null) {
      this.pool = mysql.createPool({
        uri: this.config.mysql.uri,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 60_000,
        enableKeepAlive: true
      });
    }

    return this.pool;
  }

  public async check(): Promise<HealthCheckResult> {
    try {
      await this.getPool().query("SELECT 1");
      return { state: "ok" };
    } catch (error) {
      this.logger.warn({ error }, "MySQL health check failed.");
      return { state: "down", detail: "MySQL ping failed." };
    }
  }

  public async close(): Promise<void> {
    if (this.pool == null) {
      return;
    }

    await this.pool.end();
    this.pool = undefined;
  }
}

