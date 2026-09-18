import type { FastifyInstance } from "fastify";
import { ProfileError } from "../application/profile/profileTypes.js";
import type { PlayerProfileSnapshot } from "../application/profile/profileTypes.js";
import type { ProfileAggregationService } from "../application/profile/profileAggregationService.js";
import type { AppConfig } from "../config/appConfig.js";
import { authorizeInternalRequest } from "../http/internalAuth.js";

export function registerProfileRoutes(server: FastifyInstance, config: AppConfig, profileService: ProfileAggregationService): void {
  server.get<{ Params: { uuid: string } }>("/internal/v1/players/:uuid/profile", async (request, reply) => {
    if (!authorizeInternalRequest(request, reply, config)) {
      return reply;
    }

    try {
      const profile = await profileService.getProfileByMinecraftUuid({
        minecraftUuid: request.params.uuid
      });
      return serializeProfile(profile);
    } catch (error) {
      if (error instanceof ProfileError) {
        reply.code(400);
        return {
          error: error.code,
          message: error.message
        };
      }

      throw error;
    }
  });
}

function serializeProfile(profile: PlayerProfileSnapshot) {
  return {
    ...profile,
    ...(profile.registeredAt == null ? {} : { registeredAt: profile.registeredAt.toISOString() }),
    ...(profile.linkedAt == null ? {} : { linkedAt: profile.linkedAt.toISOString() }),
    generatedAt: profile.generatedAt.toISOString()
  };
}
