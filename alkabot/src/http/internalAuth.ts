import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../config/appConfig.js";

export function authorizeInternalRequest(request: FastifyRequest, reply: FastifyReply, config: AppConfig): boolean {
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
