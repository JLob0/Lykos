import type { RoleApplyResult, RolePlan, RolePlanAction } from "../../application/roles/rolePlannerTypes.js";
import type { SetupCheck, SetupDoctorReport, SetupPlanAction, SetupPlanReport } from "../../application/setup/setupTypes.js";
import { alkaContainer, componentsV2Message, separator, textDisplay, type ComponentsV2Message } from "./componentsV2.js";

const READY_COLOR = 0x22c55e;
const DEGRADED_COLOR = 0xf59e0b;
const BLOCKED_COLOR = 0xef4444;

export function renderSetupDoctorCard(report: SetupDoctorReport): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer(
      [
        textDisplay(`## LYKOS SETUP - DOCTOR\n**Status:** ${report.overall}\n**Gerado em:** ${report.generatedAt.toISOString()}`),
        separator(),
        textDisplay(report.checks.map(renderCheckLine).join("\n"))
      ],
      colorForDoctor(report.overall)
    )
  ]);
}

export function renderSetupPlanCard(report: SetupPlanReport): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer(
      [
        textDisplay(
          [
            "## LYKOS SETUP - DRY RUN",
            `**Modo:** ${report.mode}`,
            `**Doctor:** ${report.doctorOverall}`,
            `**Acoes:** create ${report.summary.CREATE} / reuse ${report.summary.REUSE} / config ${report.summary.CONFIGURE} / wait ${report.summary.WAIT} / noop ${report.summary.NOOP}`
          ].join("\n")
        ),
        separator(),
        textDisplay(report.actions.map(renderActionLine).join("\n"))
      ],
      colorForDoctor(report.doctorOverall)
    )
  ]);
}

export function renderRolePlanCard(plan: RolePlan): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(
        [
          "## LYKOS SETUP - ROLE PLANNER",
          `**Modo:** ${plan.mode}`,
          `**Roles atuais:** ${plan.summary.currentRoles}/${plan.maxRoles}`,
          `**Projetado:** ${plan.summary.projectedRoles}/${plan.maxRoles}`,
          `**Buffer livre:** ${plan.summary.remainingCapacity}`,
          `**Acoes:** create ${plan.summary.CREATE} / reuse ${plan.summary.REUSE} / managed ${plan.summary.MANAGED} / conflict ${plan.summary.CONFLICT}`
        ].join("\n")
      ),
      separator(),
      textDisplay(plan.actions.slice(0, 15).map(renderRoleActionLine).join("\n")),
      textDisplay(plan.actions.length > 15 ? `Mais ${plan.actions.length - 15} cargo(s) omitidos neste card.` : "Nenhuma acao adicional omitida.")
    ])
  ]);
}

export function renderRoleApplyCard(result: RoleApplyResult, label: "IMPORT" | "APPLY"): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(
        [
          `## LYKOS SETUP - ROLE ${label}`,
          `**Run:** ${result.runId}`,
          `**Modo:** ${result.plan.mode}`,
          `**Persistidos:** ${result.plan.actions.length}`,
          `**Mutacao Discord:** nao`,
          `**Resumo:** create ${result.plan.summary.CREATE} / reuse ${result.plan.summary.REUSE} / managed ${result.plan.summary.MANAGED} / conflict ${result.plan.summary.CONFLICT}`
        ].join("\n")
      ),
      separator(),
      textDisplay(result.plan.actions.slice(0, 12).map(renderRoleActionLine).join("\n"))
    ])
  ]);
}

function renderCheckLine(check: SetupCheck): string {
  return `**${stateLabel(check.state)} ${check.label}**\n${check.detail}`;
}

function renderActionLine(action: SetupPlanAction): string {
  return `**[${action.state}] ${action.target}**\n${action.detail}`;
}

function renderRoleActionLine(action: RolePlanAction): string {
  const id = action.discordRoleId == null ? "" : ` \`${action.discordRoleId}\``;
  return `**[${action.state}] ${action.blueprint.name}**${id}\n${action.detail}`;
}

function stateLabel(state: SetupCheck["state"]): string {
  switch (state) {
    case "PASS":
      return "[OK]";
    case "WARN":
      return "[WARN]";
    case "FAIL":
      return "[FAIL]";
  }
}

function colorForDoctor(overall: SetupDoctorReport["overall"]): number {
  switch (overall) {
    case "READY":
      return READY_COLOR;
    case "DEGRADED":
      return DEGRADED_COLOR;
    case "BLOCKED":
      return BLOCKED_COLOR;
  }
}
