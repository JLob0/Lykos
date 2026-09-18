import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../config/appConfig.js";
import type { CommandResult } from "../contracts/envelopes.js";
import type { BridgeCommandDispatcherPort } from "./commandDispatcher.js";
import type { ServerRegistry } from "./serverRegistry.js";

export function registerServerRoutes(
  server: FastifyInstance,
  config: AppConfig,
  registry: ServerRegistry,
  commandDispatcher?: BridgeCommandDispatcherPort
): void {
  server.get("/internal/v1/servers", async (request, reply) => {
    if (!isAuthorized(request, reply, config)) {
      return reply;
    }

    return {
      servers: registry.list()
    };
  });

  server.get<{ Params: { serverId: string } }>("/internal/v1/servers/:serverId", async (request, reply) => {
    if (!isAuthorized(request, reply, config)) {
      return reply;
    }

    const serverNode = registry.get(request.params.serverId);
    if (serverNode == null) {
      reply.code(404);
      return {
        error: "SERVER_NOT_FOUND"
      };
    }

    return serverNode;
  });

  server.post<{ Params: { serverId: string } }>("/internal/v1/servers/:serverId/ping", async (request, reply) => {
    if (!isAuthorized(request, reply, config)) {
      return reply;
    }

    const serverNode = registry.get(request.params.serverId);
    if (serverNode == null) {
      reply.code(404);
      return {
        error: "SERVER_NOT_FOUND"
      };
    }

    if (commandDispatcher == null) {
      reply.code(503);
      return {
        error: "COMMAND_DISPATCHER_UNAVAILABLE"
      };
    }

    try {
      const command = await commandDispatcher.dispatchBridgePing(serverNode.serverId);
      const result = await commandDispatcher.waitForResult(command.commandId);
      if (result == null) {
        reply.code(202);
        return {
          commandId: command.commandId,
          correlationId: command.correlationId,
          targetServer: command.targetServer,
          state: "DISPATCHED"
        };
      }

      return formatCommandResult(result);
    } catch (error) {
      reply.code(503);
      return {
        error: "COMMAND_DISPATCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown bridge command dispatch failure."
      };
    }
  });
}

function formatCommandResult(result: CommandResult): CommandResult {
  return result;
}

function isAuthorized(request: FastifyRequest, reply: FastifyReply, config: AppConfig): boolean {
  if (config.internalApi.token == null && ["development", "test"].includes(config.app.environment)) {
    return true;
  }

  const authorization = request.headers.authorization;
  if (config.internalApi.token != null && authorization === `Bearer ${config.internalApi.token}`) {
    return true;
  }

  reply.code(401).send({
    error: "UNAUTHORIZED"
  });
  return false;
}
