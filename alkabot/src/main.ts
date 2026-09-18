import { LykosApp } from "./app/alkaBotApp.js";
import { loadConfig } from "./config/appConfig.js";
import { createLogger } from "./logging/logger.js";

const config = loadConfig();
const logger = createLogger(config);
const app = new LykosApp(config, logger);

let stopping = false;

async function start(): Promise<void> {
  try {
    await app.start();
    logger.info({ host: config.http.host, port: config.http.port }, "Lykos started.");
  } catch (error) {
    logger.fatal({ error }, "Lykos failed to start.");
    process.exitCode = 1;
  }
}

async function stop(signal: NodeJS.Signals): Promise<void> {
  if (stopping) {
    return;
  }

  stopping = true;
  logger.info({ signal }, "Stopping Lykos.");

  try {
    await app.stop();
  } catch (error) {
    logger.error({ error }, "Lykos stopped with errors.");
    process.exitCode = 1;
  }
}

process.once("SIGINT", (signal) => {
  void stop(signal);
});

process.once("SIGTERM", (signal) => {
  void stop(signal);
});

void start();
