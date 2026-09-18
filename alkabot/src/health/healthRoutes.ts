import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config/appConfig.js";
import type { HealthCheck, HealthCheckResult, HealthState } from "../shared/health.js";

export function registerHealthRoutes(server: FastifyInstance, config: AppConfig, checks: readonly HealthCheck[]): void {
  server.get("/health/live", async () => ({
    status: "ok",
    service: config.app.name,
    version: config.app.version,
    environment: config.app.environment
  }));

  server.get("/health/ready", async (_request, reply) => {
    const results = await Promise.all(
      checks.map(async (check) => {
        const result = await runCheck(check);
        return [check.name, result] as const;
      })
    );

    const namedResults = Object.fromEntries(results);
    const overall = getOverallState(Object.values(namedResults));

    if (overall === "down") {
      reply.code(503);
    }

    return {
      status: overall,
      checks: namedResults
    };
  });

  server.get("/metrics", async (_request, reply) => {
    reply.type("text/plain; version=0.0.4; charset=utf-8");
    return [
      "# HELP lykos_process_info Static Lykos process info.",
      "# TYPE lykos_process_info gauge",
      `lykos_process_info{version="${config.app.version}",environment="${config.app.environment}"} 1`,
      ""
    ].join("\n");
  });
}

async function runCheck(check: HealthCheck): Promise<HealthCheckResult> {
  try {
    return await check.check();
  } catch (error) {
    return {
      state: "down",
      detail: error instanceof Error ? error.message : "Unknown health check failure."
    };
  }
}

function getOverallState(results: HealthCheckResult[]): HealthState {
  if (results.some((result) => result.state === "down")) {
    return "down";
  }

  if (results.some((result) => result.state === "degraded")) {
    return "degraded";
  }

  return "ok";
}
