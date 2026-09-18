import type { ServerNodeView } from "../../bridge/serverRegistry.js";
import { actionRow, alkaContainer, componentsV2Message, primaryButton, separator, textDisplay, type ComponentsV2Message } from "./componentsV2.js";

export const NETWORK_STATUS_REFRESH_ID = "alka:network:status:refresh";

export function renderNetworkStatusCard(servers: ServerNodeView[], now: Date = new Date()): ComponentsV2Message {
  const onlineServers = servers.filter((server) => server.status === "ONLINE").length;
  const totalPlayers = servers.reduce((total, server) => total + server.onlinePlayers, 0);
  const maxPlayers = servers.reduce((total, server) => total + server.maxPlayers, 0);
  const staleServers = servers.filter((server) => server.stale).length;
  const status = servers.length === 0 ? "SEM SERVIDORES" : staleServers > 0 ? "DEGRADADO" : "ONLINE";

  return componentsV2Message([
    alkaContainer([
      textDisplay(`## ALKASTUDIO - NETWORK\n**Status:** ${status}\n**Servidores online:** ${onlineServers}/${servers.length}\n**Jogadores:** ${totalPlayers}/${maxPlayers}`),
      separator(),
      textDisplay(renderServerLines(servers, now)),
      separator(),
      actionFooter()
    ])
  ]);
}

function renderServerLines(servers: ServerNodeView[], now: Date): string {
  if (servers.length === 0) {
    return "Nenhum servidor enviou heartbeat ainda.";
  }

  return servers
    .map((server) => {
      const ageSeconds = Math.max(0, Math.floor((now.getTime() - new Date(server.lastHeartbeatAt).getTime()) / 1000));
      const capabilities = server.capabilities.length === 0 ? "sem capabilities" : `${server.capabilities.length} capabilities`;
      return `**${server.displayName}** \`${server.serverId}\`\n${server.status} - ${server.onlinePlayers}/${server.maxPlayers} players - heartbeat ha ${ageSeconds}s - ${capabilities}`;
    })
    .join("\n\n");
}

function actionFooter() {
  return actionRow([primaryButton(NETWORK_STATUS_REFRESH_ID, "Atualizar")]);
}
