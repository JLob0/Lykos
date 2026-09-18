import { join } from "node:path";
import { loadConfig } from "../config/appConfig.js";
import { DatabaseMigrator } from "../infrastructure/database/databaseMigrator.js";
import { DatabaseProvider } from "../infrastructure/database/databaseProvider.js";
import { createLogger } from "../logging/logger.js";

const config = loadConfig();
const logger = createLogger(config);
const database = new DatabaseProvider(config, logger);
const migrator = new DatabaseMigrator(database, logger);
const migrationsDirectory = join(import.meta.dirname, "..", "..", "migrations");

try {
  await migrator.run(migrationsDirectory);
  logger.info("Database migrations finished.");
} catch (error) {
  logger.fatal({ error }, "Database migrations failed.");
  process.exitCode = 1;
} finally {
  await database.close();
}

