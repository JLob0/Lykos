import type { PlayerProfileSnapshot, ProfileSourceStatus } from "../../application/profile/profileTypes.js";
import { alkaContainer, componentsV2Message, separator, textDisplay, type ComponentsV2Message } from "./componentsV2.js";

export function renderProfileCard(profile: PlayerProfileSnapshot): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(
        [
          "## LYKOS - PERFIL",
          `**Nick:** ${profile.nickname ?? "desconhecido"}`,
          `**UUID:** \`${profile.minecraftUuid}\``,
          `**Privacidade:** ${profile.privacy}`
        ].join("\n")
      ),
      separator(),
      textDisplay(renderProfileFacts(profile)),
      separator(),
      textDisplay(renderProfileSources(profile.sources))
    ])
  ]);
}

function renderProfileFacts(profile: PlayerProfileSnapshot): string {
  const rows = [
    fact("Rank", profile.rank),
    fact("Prestigio", profile.prestige),
    fact("VIP", profile.vip),
    fact("Cla", profile.clan),
    fact("Tempo online", profile.onlineTime),
    fact("Moedas", profile.coins),
    fact("Nivel", profile.level),
    fact("Servidor", profile.serverId),
    fact("Staff", profile.staff),
    fact("Registro", profile.registeredAt?.toISOString()),
    fact("Vinculo", profile.linkedAt == null ? undefined : `ativo desde ${profile.linkedAt.toISOString()}`)
  ].filter((row) => row != null);

  const statRows = profile.stats == null ? [] : [fact("Kills", numberText(profile.stats.kills)), fact("Deaths", numberText(profile.stats.deaths)), fact("K/D", numberText(profile.stats.kd))].filter((row) => row != null);
  const allRows = [...rows, ...statRows];
  return allRows.length === 0 ? "Nenhum provider trouxe dados de jogo ainda." : allRows.join("\n");
}

function renderProfileSources(sources: ProfileSourceStatus[]): string {
  if (sources.length === 0) {
    return "**Fontes:** nenhuma fonte consultada.";
  }

  return `**Fontes:** ${sources.map((source) => `${source.source}:${source.state}`).join(", ")}`;
}

function fact(label: string, value: string | undefined): string | undefined {
  if (value == null || value.length === 0) {
    return undefined;
  }

  return `**${label}:** ${value}`;
}

function numberText(value: number | undefined): string | undefined {
  return value == null ? undefined : String(value);
}
