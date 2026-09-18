import { ComponentType, MessageFlags } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { createApplicationCommandPayloads } from "../src/discord/commands/commandRegistry.js";
import { NETWORK_STATUS_REFRESH_ID, renderNetworkStatusCard } from "../src/discord/ui/networkStatusCard.js";
import type { ServerNodeView } from "../src/bridge/serverRegistry.js";

describe("Discord command registry", () => {
  it("exports the network status slash command payload", () => {
    expect(createApplicationCommandPayloads()).toMatchObject([
      {
        name: "network",
        description: "Operacoes e diagnosticos da Network Alka.",
        options: [
          {
            name: "status"
          }
        ]
      }
    ]);
  });
});

describe("network status Components V2 card", () => {
  it("renders a Components V2 response with a refresh button", () => {
    const message = renderNetworkStatusCard(
      [
        serverNode({
          serverId: "rankup-01",
          displayName: "RankUP",
          status: "ONLINE",
          onlinePlayers: 42,
          maxPlayers: 200,
          capabilities: ["bridge.ping", "server.heartbeat"]
        })
      ],
      new Date("2026-09-18T15:00:10.000Z")
    );

    expect(message.flags).toBe(MessageFlags.IsComponentsV2);
    expect(message.allowedMentions.parse).toEqual([]);
    expect(message.components[0]).toMatchObject({
      type: ComponentType.Container,
      components: expect.arrayContaining([
        expect.objectContaining({
          type: ComponentType.TextDisplay,
          content: expect.stringContaining("ALKASTUDIO - NETWORK")
        }),
        expect.objectContaining({
          type: ComponentType.ActionRow,
          components: [
            expect.objectContaining({
              custom_id: NETWORK_STATUS_REFRESH_ID,
              label: "Atualizar"
            })
          ]
        })
      ])
    });
  });
});

function serverNode(overrides: Partial<ServerNodeView>): ServerNodeView {
  return {
    serverId: "rankup-01",
    displayName: "RankUP",
    environment: "development",
    status: "ONLINE",
    bridgeVersion: "0.1.0",
    paperVersion: "1.21.8",
    javaVersion: "21.0.11",
    onlinePlayers: 0,
    maxPlayers: 0,
    lastHeartbeatAt: "2026-09-18T15:00:00.000Z",
    capabilities: [],
    stale: false,
    ...overrides
  };
}
