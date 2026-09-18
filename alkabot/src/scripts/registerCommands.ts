import { REST, Routes } from "discord.js";
import { loadConfig } from "../config/appConfig.js";
import { createApplicationCommandPayloads } from "../discord/commands/commandRegistry.js";
import { createLogger } from "../logging/logger.js";

const config = loadConfig();
const logger = createLogger(config);

if (config.discord.token == null) {
  throw new Error("DISCORD_TOKEN is required to register Discord commands.");
}

if (config.discord.clientId == null) {
  throw new Error("DISCORD_CLIENT_ID is required to register Discord commands.");
}

const rest = new REST({ version: "10" }).setToken(config.discord.token);
const commands = createApplicationCommandPayloads();
const route =
  config.discord.guildId == null
    ? Routes.applicationCommands(config.discord.clientId)
    : Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId);

await rest.put(route, {
  body: commands
});

logger.info(
  {
    commandCount: commands.length,
    scope: config.discord.guildId == null ? "global" : "guild",
    guildId: config.discord.guildId
  },
  "Discord application commands registered."
);
