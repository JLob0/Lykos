import { readdir } from "node:fs/promises";
import { basename } from "node:path";
import type { AppConfig } from "../../config/appConfig.js";
import type { ServerRegistry } from "../../bridge/serverRegistry.js";
import type { HealthCheck, HealthCheckResult } from "../../shared/health.js";
import {
  healthStateToSetupState,
  type MigrationStatusReader,
  type SetupCheck,
  type SetupDoctorOverall,
  type SetupDoctorReport,
  type SetupPlanAction,
  type SetupPlanActionState,
  type SetupPlanReport,
  type SetupRuntimeContext
} from "./setupTypes.js";

const REQUIRED_SETUP_PERMISSION_NAMES = ["ManageRoles", "ManageChannels"] as const;

export type SetupServiceDependencies = {
  config: AppConfig;
  healthChecks: readonly HealthCheck[];
  serverRegistry: ServerRegistry;
  migrationStatusReader: MigrationStatusReader;
  migrationsDirectory: string;
};

export class SetupService {
  public constructor(private readonly dependencies: SetupServiceDependencies) {}

  public async runDoctor(context: SetupRuntimeContext): Promise<SetupDoctorReport> {
    const checks: SetupCheck[] = [
      this.checkDiscordConfig(context),
      this.checkDiscordPermissions(context),
      this.checkPolicyBindings(),
      this.checkBridgeConfig(),
      this.checkBridgeServers(),
      ...(await this.runHealthChecks()),
      await this.checkMigrations()
    ];

    return {
      generatedAt: new Date(),
      overall: getOverall(checks),
      checks
    };
  }

  public async createPlan(context: SetupRuntimeContext): Promise<SetupPlanReport> {
    const doctor = await this.runDoctor(context);
    const actions: SetupPlanAction[] = [
      {
        id: "discord.commands",
        state: "REUSE",
        target: "/network status, /setup doctor, /setup plan, /setup roles, /setup import, /setup apply",
        detail: "Comandos modelados na source; registro real continua via npm run bot:discord:register."
      },
      {
        id: "database.migrations",
        state: doctor.checks.some((check) => check.id === "migrations" && check.state === "FAIL") ? "CONFIGURE" : "REUSE",
        target: "alka_schema_migrations",
        detail: "Dry-run valida se as migrations locais ja foram aplicadas antes de qualquer apply futuro."
      },
      {
        id: "policy.setup",
        state: this.hasSetupPolicyBindings() ? "REUSE" : "CONFIGURE",
        target: "POLICY_SETUP_READ_ROLE_IDS",
        detail: "Setup em producao precisa de cargo ou admin configurado antes de liberar comandos operacionais."
      },
      {
        id: "bridge.servers",
        state: this.dependencies.serverRegistry.list().length > 0 ? "REUSE" : "WAIT",
        target: "AlkaBridge heartbeats",
        detail: "Nenhum recurso e criado aqui; o plano so aguarda servidores enviarem heartbeat assinado."
      },
      {
        id: "setup.apply",
        state: "CONFIGURE",
        target: "/setup apply",
        detail: "Apply de cargos consolida blueprints no banco; criacao fisica no Discord ainda exige confirmacao/snapshot em bloco futuro."
      }
    ];

    return {
      generatedAt: new Date(),
      mode: "DRY_RUN",
      doctorOverall: doctor.overall,
      actions,
      summary: summarizeActions(actions)
    };
  }

  private checkDiscordConfig(context: SetupRuntimeContext): SetupCheck {
    if (this.dependencies.config.discord.token == null) {
      return {
        id: "discord.config",
        label: "Discord login",
        state: "FAIL",
        detail: "DISCORD_TOKEN nao esta configurado."
      };
    }

    if (context.guildId == null) {
      return {
        id: "discord.config",
        label: "Discord guild",
        state: "WARN",
        detail: "Comando executado fora de uma guild ou sem guildId disponivel."
      };
    }

    return {
      id: "discord.config",
      label: "Discord guild",
      state: "PASS",
      detail: context.guildName == null ? `Guild ${context.guildId}.` : `${context.guildName} (${context.guildId}).`
    };
  }

  private checkDiscordPermissions(context: SetupRuntimeContext): SetupCheck {
    if (context.botPermissionNames.length === 0) {
      return {
        id: "discord.permissions",
        label: "Permissoes do bot",
        state: "WARN",
        detail: "Nao foi possivel ler appPermissions da interaction."
      };
    }

    const missing = REQUIRED_SETUP_PERMISSION_NAMES.filter((permission) => !context.botPermissionNames.includes(permission));
    if (missing.length > 0) {
      return {
        id: "discord.permissions",
        label: "Permissoes do bot",
        state: "WARN",
        detail: `Faltando para blocos futuros: ${missing.join(", ")}.`
      };
    }

    return {
      id: "discord.permissions",
      label: "Permissoes do bot",
      state: "PASS",
      detail: "Permissoes minimas para planejar roles/canais estao presentes."
    };
  }

  private checkPolicyBindings(): SetupCheck {
    if (this.hasSetupPolicyBindings()) {
      return {
        id: "policy.bindings",
        label: "Policy setup",
        state: "PASS",
        detail: "Admin ou cargo de setup configurado."
      };
    }

    return {
      id: "policy.bindings",
      label: "Policy setup",
      state: this.dependencies.config.app.environment === "production" ? "FAIL" : "WARN",
      detail: "Nenhum admin/cargo de setup configurado; dev/test ainda usam fallback controlado."
    };
  }

  private checkBridgeConfig(): SetupCheck {
    if (!this.dependencies.config.bridge.transportEnabled) {
      return {
        id: "bridge.config",
        label: "AlkaBridge",
        state: "WARN",
        detail: "BRIDGE_TRANSPORT_ENABLED esta false; heartbeats reais nao serao consumidos."
      };
    }

    if (this.dependencies.config.bridge.hmacSecret == null) {
      return {
        id: "bridge.config",
        label: "AlkaBridge",
        state: "FAIL",
        detail: "Bridge habilitada sem BRIDGE_HMAC_SECRET."
      };
    }

    return {
      id: "bridge.config",
      label: "AlkaBridge",
      state: "PASS",
      detail: "Bridge habilitada com HMAC configurado."
    };
  }

  private checkBridgeServers(): SetupCheck {
    const servers = this.dependencies.serverRegistry.list();
    if (servers.length === 0) {
      return {
        id: "bridge.servers",
        label: "Servers",
        state: "WARN",
        detail: "Nenhum servidor enviou heartbeat ao Lykos ainda."
      };
    }

    const stale = servers.filter((server) => server.stale).length;
    return {
      id: "bridge.servers",
      label: "Servers",
      state: stale > 0 ? "WARN" : "PASS",
      detail: `${servers.length} servidor(es) registrados; ${stale} stale.`
    };
  }

  private async runHealthChecks(): Promise<SetupCheck[]> {
    return Promise.all(
      this.dependencies.healthChecks.map(async (check) => {
        const result = await runCheck(check);
        return {
          id: `health.${check.name}`,
          label: `Health ${check.name}`,
          state: healthStateToSetupState(result.state),
          detail: result.detail ?? result.state
        };
      })
    );
  }

  private async checkMigrations(): Promise<SetupCheck> {
    try {
      const expectedVersions = await this.getExpectedMigrationVersions();
      const appliedVersions = await this.dependencies.migrationStatusReader.listAppliedVersions();
      const missing = expectedVersions.filter((version) => !appliedVersions.has(version));

      if (missing.length > 0) {
        return {
          id: "migrations",
          label: "Migrations",
          state: "FAIL",
          detail: `Migrations pendentes: ${missing.join(", ")}.`
        };
      }

      return {
        id: "migrations",
        label: "Migrations",
        state: "PASS",
        detail: `${expectedVersions.length} migration(s) aplicadas.`
      };
    } catch (error) {
      return {
        id: "migrations",
        label: "Migrations",
        state: "FAIL",
        detail: error instanceof Error ? error.message : "Falha desconhecida lendo migrations."
      };
    }
  }

  private async getExpectedMigrationVersions(): Promise<string[]> {
    const entries = await readdir(this.dependencies.migrationsDirectory);
    return entries
      .filter((entry) => entry.endsWith(".sql"))
      .map((entry) => basename(entry, ".sql"))
      .sort((left, right) => left.localeCompare(right));
  }

  private hasSetupPolicyBindings(): boolean {
    return (
      this.dependencies.config.policy.adminDiscordUserIds.size > 0 ||
      this.dependencies.config.policy.adminRoleIds.size > 0 ||
      this.dependencies.config.policy.setupReadRoleIds.size > 0
    );
  }
}

async function runCheck(check: HealthCheck): Promise<HealthCheckResult> {
  try {
    return await check.check();
  } catch (error) {
    return {
      state: "down",
      detail: error instanceof Error ? error.message : "Unknown setup health check failure."
    };
  }
}

function getOverall(checks: readonly SetupCheck[]): SetupDoctorOverall {
  if (checks.some((check) => check.state === "FAIL")) {
    return "BLOCKED";
  }

  if (checks.some((check) => check.state === "WARN")) {
    return "DEGRADED";
  }

  return "READY";
}

function summarizeActions(actions: readonly SetupPlanAction[]): Record<SetupPlanActionState, number> {
  return {
    CREATE: actions.filter((action) => action.state === "CREATE").length,
    REUSE: actions.filter((action) => action.state === "REUSE").length,
    CONFIGURE: actions.filter((action) => action.state === "CONFIGURE").length,
    WAIT: actions.filter((action) => action.state === "WAIT").length,
    NOOP: actions.filter((action) => action.state === "NOOP").length
  };
}
