import type { LinkedIdentity } from "../../application/identity/identityTypes.js";
import { alkaContainer, componentsV2Message, separator, textDisplay, type ComponentsV2Message } from "./componentsV2.js";

export function renderLinkedIdentityCard(identity: LinkedIdentity): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay(
        [
          "## LYKOS - CONTA VINCULADA",
          `**Minecraft:** ${identity.minecraftName ?? "desconhecido"}`,
          `**UUID:** \`${identity.minecraftUuid}\``,
          `**Vinculado em:** ${identity.linkedAt.toISOString()}`
        ].join("\n")
      )
    ])
  ]);
}

export function renderLinkSuccessCard(identity: LinkedIdentity): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay("## LYKOS - VINCULO CONFIRMADO"),
      separator(),
      textDisplay(
        [
          `Sua conta Discord foi vinculada ao Minecraft **${identity.minecraftName ?? identity.minecraftUuid}**.`,
          `UUID: \`${identity.minecraftUuid}\``
        ].join("\n")
      )
    ])
  ]);
}

export function renderUnlinkSuccessCard(identity: LinkedIdentity): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay("## LYKOS - VINCULO REMOVIDO"),
      separator(),
      textDisplay(`O vinculo com **${identity.minecraftName ?? identity.minecraftUuid}** foi removido.`)
    ])
  ]);
}

export function renderLinkHelpCard(): ComponentsV2Message {
  return componentsV2Message([
    alkaContainer([
      textDisplay("## LYKOS - VINCULAR CONTA"),
      separator(),
      textDisplay("No servidor Minecraft, gere um codigo temporario com o comando de vinculacao. Depois use `/link codigo:ALKA-XXXXX` aqui no Discord.")
    ])
  ]);
}
