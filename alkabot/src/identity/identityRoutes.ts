import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IdentityLinkError } from "../application/identity/identityTypes.js";
import type { IdentityLinkService } from "../application/identity/identityLinkService.js";
import type { AppConfig } from "../config/appConfig.js";
import { authorizeInternalRequest } from "../http/internalAuth.js";

const createLinkCodeBodySchema = z.object({
  minecraftUuid: z.uuid(),
  minecraftName: z.string().trim().min(1).max(16).optional(),
  serverId: z.string().trim().min(1).max(96).optional()
});

export function registerIdentityRoutes(server: FastifyInstance, config: AppConfig, identityLinkService: IdentityLinkService): void {
  server.post("/internal/v1/link-codes", async (request, reply) => {
    if (!authorizeInternalRequest(request, reply, config)) {
      return reply;
    }

    const parsed = createLinkCodeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return {
        error: "INVALID_LINK_CODE_REQUEST"
      };
    }

    try {
      const created = await identityLinkService.createMinecraftLinkCode({
        minecraftUuid: parsed.data.minecraftUuid,
        ...(parsed.data.minecraftName == null ? {} : { minecraftName: parsed.data.minecraftName }),
        ...(parsed.data.serverId == null ? {} : { serverId: parsed.data.serverId })
      });
      return {
        code: created.code,
        expiresAt: created.expiresAt.toISOString(),
        minecraftUuid: created.minecraftUuid
      };
    } catch (error) {
      if (error instanceof IdentityLinkError) {
        reply.code(statusForIdentityError(error));
        return {
          error: error.code,
          message: error.message
        };
      }

      throw error;
    }
  });
}

function statusForIdentityError(error: IdentityLinkError): number {
  switch (error.code) {
    case "RATE_LIMITED":
      return 429;
    case "MINECRAFT_ALREADY_LINKED":
    case "DISCORD_ALREADY_LINKED":
      return 409;
    case "INVALID_CODE":
    case "EXPIRED_CODE":
    case "CODE_ALREADY_USED":
    case "NOT_LINKED":
      return 400;
  }
}
