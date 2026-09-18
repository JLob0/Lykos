import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../config/appConfig.js";
import type { ServerRegistry } from "./serverRegistry.js";

export function registerServerRoutes(server: FastifyInstance, config: AppConfig, registry: ServerRegistry): void {
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

