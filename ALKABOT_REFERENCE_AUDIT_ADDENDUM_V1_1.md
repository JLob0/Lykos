# ALKABOT — REFERENCE AUDIT & V1.1 ADDENDUM
## yDiscordHook + LeafDiscord → Extensões do MASTER MVP
### AlkaStudio Network — 18/09/2026

> **IMPORTANTE:** este documento **NÃO substitui, reescreve nem altera** `ALKABOT_MASTER_MVP_V1.md`.
>
> O MASTER MVP V1 permanece intacto e continua sendo a especificação principal.
>
> Este arquivo é um **companion/addendum**: registra tudo que foi encontrado ao analisar referências reais de mercado e adiciona módulos, fluxos, contratos, testes e decisões que não estavam explícitos no documento original.
>
> Fontes analisadas:
>
> 1. yDiscordHook — configuração pública:
>    https://github.com/yStorePlugins/configs/tree/main/yDiscordHook
> 2. yDiscordHook — documentação:
>    https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook
> 3. LeafDiscord 1.1.0 — JAR fornecido pelo usuário:
>    `LeafDiscord.jar`
>
> O JAR do LeafDiscord foi analisado **estaticamente** através de seus arquivos públicos de configuração, descritores de plataforma e classes bootstrap. O payload protegido/empacotado não foi desmontado nem contornado.

---

# 1. CONCLUSÃO DA AUDITORIA

O MASTER MVP V1 já é arquiteturalmente mais forte que os dois exemplos em:

```text
separação Bot ↔ Minecraft
segurança
audit
idempotência
contratos
Redis
policy engine
staff
observabilidade
Sagas
Components V2
multi-server
reconciliation
```

Porém yDiscordHook e LeafDiscord mostram várias features de produto extremamente úteis que ainda não estavam suficientemente explícitas no MASTER:

```text
vinculação iniciada pelos dois lados
DM confirmation
nickname sync
recompensa por primeiro vínculo
Nitro Booster lifecycle
role sync triggers
reverse role sync
role refresh manual
menu Minecraft de Discord
PlaceholderAPI expansion
SDK/API pública para outros plugins
message/embed/template API
attachment/image delivery
named webhooks
event relay
chat bridge por canal
chat command capture
anti-mention
multi-destination channels
proxy/backend hybrid topology
join/quit/server-switch
rotating bot activity
localização PT/EN
Discord-only/API-only behavior
```

Esses itens devem ser adicionados como extensões do MASTER, sem remover nenhum princípio já definido.

---

# 2. REFERÊNCIA A — YDISCORDHOOK

A configuração pública e documentação do yDiscordHook mostram um plugin focado em:

```text
Minecraft ↔ Discord account linking
role synchronization
verification token
first-link rewards
server booster integration
PAPI placeholders
Minecraft menu
Discord embeds
webhooks
public Bukkit API
```

## Recursos confirmados

### Vinculação

O plugin suporta:

```text
/vinculardiscord
/desvinculardiscord
Discord slash command /vincular
token/código de verificação
expiração de 60 segundos
aviso ao jogador não vinculado
```

### Roles

`cargos.yml` possui:

```text
cargo dado ao vincular
role por permissão
prioridade de role
nickname sync
remoção de role se perder permissão
```

Exemplo conceitual:

```yaml
vip:
  Ordem: 1
  ID: "..."
  Permissao: "ydiscordhook.vip"
  Sincronizar:
    Ativar: true
    Nick: "[VIP] {player}"
```

### Booster

Possui lifecycle:

```text
virou Booster
deixou de ser Booster
executar reward uma vez ou ao login
cargo Booster
quantidade de boosts
```

### Recompensas

Pode dar:

```text
reward no primeiro vínculo
reward por número de boosts
item
comando
chance
```

### PAPI

Expõe:

```text
%ydiscordhook_vinculado%
%ydiscordhook_id%
%ydiscordhook_name%
%ydiscordhook_tag%
```

### API pública

A documentação expõe um Bukkit Service:

```text
DiscordAPIHolder
```

com operações como:

```text
getPlayer(...)
sendMessage(...)
sendEmbed(...)
getJda()
```

### Templates Discord

`discord.yml` contém embeds nomeadas com:

```text
title
url
thumbnail
image
color
author
footer
description
timestamp
fields
placeholders
```

Também suporta imagem/attachment para QR Code de pagamento.

### Webhooks

`webhooks.yml` possui destinations nomeadas:

```text
anuncios
pagamentos
...
```

e comando administrativo para enviar uma template a um destination.

### Menu Minecraft

`menus/principal.yml` oferece:

```text
status da conta
vincular
desvincular
link do Discord
booster status
data do vínculo
Discord ID
```

---

# 3. REFERÊNCIA B — LEAFDISCORD 1.1.0

O JAR fornecido possui bootstraps para:

```text
Paper/Bukkit
BungeeCord
Velocity
```

Descritores encontrados:

```text
plugin.yml
bungee.yml
velocity-plugin.json
```

O bootstrap Bukkit declara:

```text
folia-supported: true
depend: LeafPlugins
softdepend:
  LuckPerms
  PlaceholderAPI
  nChat
  LegendChat
```

A biblioteca JDA incluída no JAR é da linha:

```text
JDA 6.4.1
```

Isso não muda nossa decisão de usar TypeScript + discord.js no AlkaBot principal; serve apenas como evidência de que o LeafDiscord encapsula um bot Java local.

## Arquivos expostos

```text
config.yml
commands.yml
groups.yml
link-menu.yml
chat-bridge.yml
proxyconfig.yml
messages_pt.yml
messages_en.yml
messages_es.yml
```

## Features encontradas

### Banco

Pode usar:

```text
banco global do LeafPlugins
ou
SQLite/MySQL próprio
```

Nosso equivalente deve continuar sendo:

```text
AlkaCore/Alka backend como fonte compartilhada
```

sem banco duplicado desnecessário.

### only-api mode

Existe:

```yaml
only-api: false
```

que permite usar o plugin somente como biblioteca JDA.

Não copiar literalmente.

Nosso equivalente deve ser:

```text
AlkaDiscordSDK/API
```

sem colocar JDA/Discord client dentro do Paper.

### Hybrid proxy-backend

Existe:

```yaml
compatibility:
  proxy-backend:
    mode: standalone|hybrid
```

e separa responsabilidades:

```text
proxy:
  chat bridge
  events
  join/quit role sync

backend:
  chat bridge
  events
  role sync
```

Isso é uma excelente referência para nossa topologia de autoridade.

### Chat Bridge

Suporta:

```text
Minecraft → Discord
Discord → Minecraft
vários Discord channels
format
anti-mention
default chat channel
capture commands
nChat integration
```

### Múltiplos canais lógicos

`chat-bridge.yml` define:

```text
global
local
tell
events
```

com aliases:

```text
/g
/global
/l
/local
/tell
/msg
/w
/r
```

e mapping do nChat.

### Eventos

Config expõe:

```text
join
quit
server-switch
death
command logs
```

com destinos múltiplos.

### Linking

Tem:

```text
Minecraft-first linking
Discord-first linking
DM confirmation
accept/deny buttons
expiration
Discord member verification
```

### Role sync

Suporta:

```text
Minecraft → Discord
Discord → Minecraft
sync no join
sync no quit
cooldown
```

### Rewards

Primeiro vínculo pode executar rewards.

### Menu

`link-menu.yml` possui:

```text
link
status
unlink
refresh roles
```

### Idiomas

Encontrados:

```text
messages_pt.yml
messages_en.yml
messages_es.yml
```

### Activity

Bot pode alternar presença/status em frames:

```text
%online% jogadores
Vincule sua conta
...
```

---

# 4. O QUE ADOTAR NO ALKABOT

Adicionar os seguintes módulos/serviços ao MASTER V1 como extensões.

```text
BidirectionalLinkService
DiscordMemberProjectionService
RoleSyncService
NicknameSyncService
LinkRewardService
DiscordBoosterService
DiscordNotificationService
DiscordTemplateService
WebhookDestinationService
MinecraftDiscordMenuService
DiscordPlaceholderService
ChatBridgeService
DiscordEventRelayService
BotPresenceService
AlkaDiscordSDK
ProxyAuthorityService
```

---

# 5. CORREÇÃO 01 — VINCULAÇÃO BIDIRECIONAL

O MASTER V1 descrevia principalmente:

```text
Minecraft gera code
Discord consome code
```

Devemos manter esse fluxo e adicionar um segundo.

## Fluxo A — Minecraft-first

```text
Minecraft:
/discord vincular

↓
gera code

Discord:
/link code:ALKA-XXXX

↓
confirma
```

## Fluxo B — Discord-first

```text
Discord:
/link

↓
gera code

Minecraft:
/discord vincular ALKA-XXXX

↓
confirma
```

## Fluxo C — DM confirmation

Quando o jogador fornece Discord ID no Minecraft:

```text
/discord vincular <discord-user>
```

Bot envia DM:

```text
Recebemos um pedido de vínculo com MestreBR.

[Aceitar vínculo]
[Recusar]
```

Somente o Discord User alvo pode clicar.

## Segurança

Todos compartilham:

```text
LinkRequest
nonce
hashedCode
expiresAt
minecraftUuid
discordUserId
origin
status
attempts
```

Estados:

```text
PENDING
CONFIRMED
DENIED
EXPIRED
CONFLICT
CANCELLED
```

---

# 6. CORREÇÃO 02 — SDK/API PÚBLICA PARA PLUGINS ALKA

O yDiscordHook mostra corretamente que outros plugins precisam usar Discord sem reinventar a integração.

Não expor raw `JDA`.

Criar:

```java
public interface AlkaDiscordService {

    CompletableFuture<Optional<LinkedDiscordIdentity>> getIdentity(UUID playerId);

    CompletableFuture<Boolean> isLinked(UUID playerId);

    CompletableFuture<NotificationResult> sendNotification(
        UUID playerId,
        String templateId,
        Map<String, String> variables
    );

    CompletableFuture<RoleSyncResult> requestRoleSync(UUID playerId);

    CompletableFuture<Void> publishEvent(AlkaDiscordEvent event);
}
```

## Registro

Pode ser exposto através de:

```text
AlkaCore service registry
+
Bukkit ServicesManager adapter
```

para plugins standalone que precisem resolver a service de forma limpa.

## Nunca expor

```java
getJda()
```

como API oficial da Network.

Isso quebraria nossa separação:

```text
Minecraft não fala Discord diretamente.
```

---

# 7. CORREÇÃO 03 — DISCORD NOTIFICATION API

Outros Alka plugins precisam poder solicitar:

```text
DM
channel notification
staff alert
Components V2 card
attachment
```

Sem conhecer discord.js.

Contrato:

```json
{
  "event": "discord.notification.requested",
  "version": 1,
  "recipient": {
    "type": "LINKED_PLAYER",
    "minecraftUuid": "..."
  },
  "template": "rank.promoted",
  "variables": {
    "rank": "Imperador"
  }
}
```

AlkaBot decide renderização/entrega.

---

# 8. CORREÇÃO 04 — TEMPLATE ENGINE

O yDiscordHook mostra o valor de templates totalmente configuráveis.

Nosso sistema deve ser mais moderno:

```text
Components V2 first
Legacy Embed compatibility
Plain Text
Attachment
Webhook
DM
```

Estrutura sugerida:

```text
templates/
├── link/
│   ├── request.yml
│   ├── confirmed.yml
│   └── denied.yml
├── staff/
├── moderation/
├── network/
├── payment/
└── notifications/
```

Exemplo:

```yaml
id: rank.promoted
version: 1
type: components_v2

container:
  accent: "#8b5cf6"

content:
  title: "Promoção de Ranking"
  text:
    - "**{player}** avançou para **{rank}**."
```

## Variables

Devem ser declaradas:

```yaml
variables:
  player:
    required: true
  rank:
    required: true
```

Template inválida falha no boot/teste, não em produção aleatoriamente.

---

# 9. CORREÇÃO 05 — ATTACHMENTS

Adicionar suporte a:

```text
QR Code
skin image
generated report
ticket transcript
evidence
ranking image
```

Mas através de `AttachmentRef`, não Base64 gigante dentro de todo evento.

Exemplo:

```json
{
  "type": "GENERATED_FILE",
  "contentType": "image/png",
  "name": "qrcode.png",
  "storageRef": "..."
}
```

Para pequenos payloads internos controlados, Base64 pode existir como fallback, mas não é o formato primário do event bus.

---

# 10. CORREÇÃO 06 — WEBHOOK DESTINATIONS

yDiscordHook permite webhooks nomeados.

Adotar conceito, corrigindo segurança.

## Não fazer

```yaml
webhooks:
  logs: https://discord.com/api/webhooks/ID/TOKEN
```

em Git/config normal.

## Fazer

```yaml
webhooks:
  logs:
    secretRef: DISCORD_WEBHOOK_LOGS
```

ou:

```text
WebhookDestination
id
name
channelPurpose
secretReference
enabled
```

## Commands

```text
/webhook test
/webhook status
```

Não oferecer envio arbitrário de qualquer URL a qualquer usuário.

---

# 11. CORREÇÃO 07 — NICKNAME SYNC

Adicionar:

```text
DiscordMemberProjectionService
```

que calcula nickname esperado.

Exemplo:

```text
[M] MestreBR
[DEV] MestreBR
[VIP] MestreBR
```

Policy:

```yaml
nickname:
  enabled: true
  source: MINECRAFT_NAME
  max_length_policy: truncate_prefix_first
  preserve_manual_override: true
```

## Prioridade

Nunca concatenar 5 prefixes.

Resolver:

```text
highestDisplayPriority
```

separado de permission hierarchy.

---

# 12. CORREÇÃO 08 — MEMBER ROLE ON LINK

Adicionar role de:

```text
Membro Verificado
Conta Vinculada
```

opcional.

Lifecycle:

```text
link confirmed → add
unlink → remove
```

Esse role não substitui outras roles.

---

# 13. CORREÇÃO 09 — FIRST-LINK REWARDS

Criar:

```text
LinkRewardService
RewardLedger
```

Nunca executar reward apenas porque `linked=true`.

Registrar claim:

```text
rewardId
minecraftUuid
reason
grantedAt
sourceLinkId
status
```

Garante:

```text
link
unlink
link
```

não gera reward infinita.

## Reward Actions

Preferir actions tipadas:

```text
currency
item
key
VIP duration
permission
crate key
cosmetic
```

Fallback:

```text
SAFE_CONSOLE_ACTION
```

somente allowlisted e validada.

---

# 14. CORREÇÃO 10 — DISCORD BOOSTER

Criar:

```text
DiscordBoosterService
```

Eventos:

```text
discord.booster.started
discord.booster.updated
discord.booster.ended
```

Dados:

```text
discordUserId
minecraftUuid
boostCount
since
```

Rewards:

```text
1x
2x
3x
...
```

## Ledger

Cada tier/lifecycle possui claim ledger.

Evitar:

```text
join spam
reward duplicada
boost remove/add exploit
```

## Integração possível

```text
AlkaVips
AlkaCrates
AlkaEconomy
AlkaEffects
```

sempre via providers/actions.

---

# 15. CORREÇÃO 11 — ROLE SYNC TRIGGERS

LeafDiscord possui sync em join/quit + cooldown.

Nosso RoleSyncService deve suportar:

```text
ON_LINK
ON_UNLINK
ON_JOIN
ON_QUIT
ON_PERMISSION_EVENT
ON_DISCORD_ROLE_EVENT
MANUAL
PERIODIC_RECONCILIATION
```

Com:

```text
debounce
cooldown
correlationId
origin
```

Join não deve causar 30 chamadas REST se nada mudou.

---

# 16. CORREÇÃO 12 — MANUAL ROLE REFRESH

Minecraft:

```text
/discord atualizar
```

Discord:

```text
/sync me
```

Menu Minecraft:

```text
[Atualizar cargos]
```

Limite:

```text
cooldown
```

Resposta mostra:

```text
adicionados
removidos
inalterados
conflitos
```

---

# 17. CORREÇÃO 13 — PAPI EXPANSION

Criar placeholders:

```text
%alkadiscord_linked%
%alkadiscord_id%
%alkadiscord_name%
%alkadiscord_username%
%alkadiscord_display_name%
%alkadiscord_booster%
%alkadiscord_boost_count%
%alkadiscord_role_sync_status%
```

Opcionalmente:

```text
%alkadiscord_staff_position%
```

## Regras

Placeholder nunca faz chamada HTTP/Redis bloqueante.

Usar cache/read model.

---

# 18. CORREÇÃO 14 — MENU MINECRAFT

Criar menu via **AlkaCore BaseGui**, nunca listener próprio.

Comando:

```text
/discord
```

Menu:

```text
[Conta]
[Status]
[Vincular/Desvincular]
[Atualizar cargos]
[Discord da Network]
[Preferências]
```

Exemplo:

```text
Conta: @jeferson
ID: 123...
Vinculado em: 18/09/2026
Booster: 2x
Sync: OK
```

---

# 19. CORREÇÃO 15 — CHAT BRIDGE

Adicionar módulo opcional:

```text
ChatBridgeService
```

Feature flag default:

```text
false
```

Canais lógicos:

```text
global
local
staff
events
```

Não sincronizar tell privado por padrão.

## Direction

Por canal:

```text
MINECRAFT_TO_DISCORD
DISCORD_TO_MINECRAFT
BIDIRECTIONAL
```

## Message Envelope

```json
{
  "messageId": "...",
  "channel": "global",
  "source": "MINECRAFT",
  "serverId": "rankup-01",
  "author": {
    "minecraftUuid": "...",
    "discordUserId": "..."
  },
  "content": "...",
  "timestamp": "..."
}
```

---

# 20. CORREÇÃO 16 — COMMAND CHAT CAPTURE

LeafDiscord captura:

```text
/g
/l
/msg
/tell
```

No nosso caso, preferir API/event do `AlkaChat-Plus`.

Fallback de command capture somente quando não existir API.

Mapping:

```yaml
chatMappings:
  global:
    minecraftChannels: [global, g]
    discordChannelRef: chat-global

  local:
    enabled: false

  staff:
    minecraftChannels: [staff]
    discordChannelRef: chat-staff
```

---

# 21. CORREÇÃO 17 — CHAT SECURITY

Obrigatório:

```text
prevent Discord mentions
sanitize Markdown
escape Components/mentions
rate limit
max message size
linked identity requirement
permission check
origin label
```

Nunca permitir Minecraft:

```text
@everyone
@here
<@&role>
```

acionar mentions reais.

---

# 22. CORREÇÃO 18 — EVENT RELAY

Adicionar:

```text
DiscordEventRelayService
```

Eventos configuráveis:

```text
player.joined
player.left
player.server.changed
player.death
command.executed
rank.changed
vip.changed
maintenance
anti-lag
```

Cada destination pode receber template diferente.

---

# 23. CORREÇÃO 19 — MULTI-DESTINATION

LeafDiscord aceita vários canais.

Nosso `DestinationSet` deve suportar:

```text
Discord channel
Discord thread
Webhook
DM
log sink
future Activity
```

Exemplo:

```yaml
eventRoutes:
  server.player.joined:
    destinations:
      - discord:join-log
      - webhook:network-events
```

---

# 24. CORREÇÃO 20 — BOT PRESENCE

Adicionar `BotPresenceService`.

Config:

```yaml
presence:
  enabled: true
  intervalSeconds: 30
  frames:
    - "{online} jogadores online"
    - "play.alkastudio.com.br"
    - "/link • Vincule sua conta"
```

Não atualizar a cada 5 segundos sem necessidade.

Cachear metrics.

---

# 25. CORREÇÃO 21 — LOCALIZAÇÃO

Além de:

```text
pt-BR
en-US
```

arquitetura permite:

```text
es-ES
```

sem custo estrutural.

Ordem:

```text
User preference
Guild preference
Default pt-BR
```

---

# 26. CORREÇÃO 22 — PROXY / BACKEND AUTHORITY

LeafDiscord mostra um problema real de redes: se proxy e backend observarem o mesmo evento, há duplicação.

Adicionar:

```text
TopologyAuthority
```

Por event type:

```yaml
authority:
  player.joined: proxy
  player.left: proxy
  player.server.changed: proxy
  minecraft.chat.global: backend
  rank.changed: backend
  economy.changed: backend
```

Se não houver proxy integration:

```text
backend authority
```

---

# 27. ALKAPROXYBRIDGE — OPCIONAL

Não entra no P0 obrigatório.

Projeto futuro:

```text
AlkaProxyBridge
```

para Velocity/Bungee equivalente.

Responsável por:

```text
server switch
network join/quit
proxy player directory
proxy maintenance/routing
```

Ele usa os mesmos contracts.

Não colocar código Velocity dentro do AlkaBridge Paper.

---

# 28. CORREÇÃO 23 — PUBLIC API MODE E SDK

Leaf possui `only-api`.

Nosso equivalente:

```text
AlkaDiscordSDK
```

Não é outro bot.

É um SDK/Service para plugins Alka solicitarem operações.

Objetivo:

```text
plugin gameplay
  ↓
AlkaDiscordService
  ↓
AlkaBridge/EventBus
  ↓
AlkaBot
```

---

# 29. CORREÇÃO 24 — DISCORD INVITE SERVICE

Minecraft `/discord` deve poder:

```text
abrir menu
mostrar URL
mensagem clicável
```

Criar config:

```yaml
discordInvite:
  url: "https://discord.gg/..."
```

No chat usar Adventure click event.

Nada de JSON legado `§` cru.

---

# 30. CORREÇÃO 25 — LINKING REMINDER

Config:

```yaml
linkReminder:
  enabled: true
  delaySeconds: 5
  cooldownHours: 24
  dismissDays: 7
```

Não mandar em todo join.

Player pode:

```text
/discord lembrete off
```

ou preferência via menu.

---

# 31. CORREÇÃO 26 — OPTIONAL LINK REQUIREMENT

yDiscordHook pode bloquear chat até vincular.

Nosso sistema pode oferecer policy:

```yaml
requirements:
  linkedAccount:
    requiredFor:
      - NONE
```

Opções futuras:

```text
CHAT_GLOBAL
TRADING
STAFF
COMPETITIVE_QUEUE
```

Default:

```text
NONE
```

Não obrigar conta Discord em gameplay comum sem decisão explícita.

---

# 32. CORREÇÃO 27 — DISCORD MEMBER PROJECTION

Role + nickname são duas projections separadas.

```text
StaffAssignment
VIP
Rank
Booster
Linked
       ↓
DiscordMemberProjection
       ├── roles
       └── nickname
```

Um diff engine calcula:

```text
expected
actual
add
remove
rename
```

---

# 33. CORREÇÃO 28 — ROLE PRIORITY

yDiscordHook possui `Ordem`.

Adicionar:

```text
displayPriority
syncPriority
hierarchyPriority
```

Não confundir.

Exemplo:

```text
Founder:
  displayPriority: 1000

VIP:
  displayPriority: 100
```

Nickname usa `displayPriority`.

Discord hierarchy continua sendo validada pela role real.

---

# 34. CORREÇÃO 29 — NOTIFICATION PREFERENCES

DMs podem falhar ou incomodar.

Tabela:

```text
notification_preferences
```

Categorias:

```text
security
staff
payments
rank
vip
ticket
appeal
events
clan
marketing
```

Security-critical pode ter regras especiais.

---

# 35. CORREÇÃO 30 — DELIVERY RESULT

Cada notification gera:

```text
SENT
FAILED_DM_CLOSED
FAILED_NOT_LINKED
FAILED_RATE_LIMIT
FAILED_TEMPLATE
SKIPPED_PREFERENCE
```

Nunca retornar apenas boolean genérico internamente.

---

# 36. NOVAS TABELAS

Adicionar ao modelo do MASTER:

```text
discord_link_requests
discord_reward_ledger
discord_booster_state
discord_booster_reward_ledger
discord_notification_preferences
discord_notification_deliveries
discord_templates
discord_webhook_destinations
discord_member_projection_state
discord_chat_routes
discord_event_routes
discord_presence_config
discord_topology_authority
```

---

# 37. LINK REQUEST SCHEMA

```text
id ULID
minecraft_uuid
discord_user_id nullable
code_hash nullable
origin MINECRAFT|DISCORD
status
created_at
expires_at
confirmed_at
denied_at
attempt_count
correlation_id
```

---

# 38. REWARD LEDGER

```text
id
minecraft_uuid
reward_id
reward_type
reason
source_id
status
granted_at
correlation_id
```

Unique semantic key:

```text
minecraft_uuid + reward_id + reason/source lifecycle
```

---

# 39. BOOSTER STATE

```text
discord_user_id
minecraft_uuid
boost_count
started_at
last_seen_at
ended_at
state_version
```

---

# 40. TEMPLATE MODEL

```text
template_id
version
renderer
locale
enabled
definition
updated_at
```

Renderers:

```text
COMPONENTS_V2
EMBED
PLAIN_TEXT
```

---

# 41. WEBHOOK DESTINATION MODEL

```text
id
name
purpose
secret_ref
enabled
allowed_template_prefixes
rate_limit_policy
```

---

# 42. CHAT ROUTE MODEL

```text
route_id
logical_channel
direction
discord_channel_id
minecraft_channel
server_scope
linked_only
enabled
```

---

# 43. COMMANDS ADICIONAIS

Minecraft:

```text
/discord
/discord vincular
/discord vincular <codigo|discord>
/discord desvincular
/discord status
/discord atualizar
/discord lembrete
```

Discord:

```text
/link
/unlink
/sync me
/profile
```

Admin:

```text
/sync player
/sync roles
/template test
/webhook test
/booster inspect
/link inspect
```

---

# 44. PLACEHOLDER EXPANSION

```text
%alkadiscord_linked%
%alkadiscord_id%
%alkadiscord_username%
%alkadiscord_display_name%
%alkadiscord_booster%
%alkadiscord_boost_count%
%alkadiscord_linked_at%
%alkadiscord_sync_status%
```

Não fazer network call durante placeholder evaluation.

---

# 45. API JAVA

```java
public interface AlkaDiscordService {

    CompletionStage<Boolean> isLinked(UUID playerId);

    CompletionStage<Optional<LinkedDiscordIdentity>> identity(UUID playerId);

    CompletionStage<NotificationResult> notify(
        UUID playerId,
        String template,
        Map<String, String> variables
    );

    CompletionStage<RoleSyncResult> syncRoles(UUID playerId);

    CompletionStage<Void> publish(
        String eventType,
        Object payload
    );
}
```

---

# 46. API BOT / INTERNAL

```text
GET  /internal/v1/discord/identity/:uuid
POST /internal/v1/discord/notifications
POST /internal/v1/discord/sync/:uuid
GET  /internal/v1/discord/booster/:uuid
```

Autenticação interna obrigatória.

---

# 47. TEMPLATE VALIDATION

CI testa:

```text
template parse
required variables
component count
field lengths
button IDs
locale completeness
unsupported renderer
```

---

# 48. CHAT BRIDGE DEDUPE

Mensagem leva:

```text
messageId
origin
serverId
routeId
```

Se volta do Discord para Minecraft:

```text
origin = DISCORD
```

e não é republicada como Minecraft-origin.

---

# 49. EVENT DEDUPE EM HYBRID

Proxy e backend podem emitir semanticamente o mesmo join.

`TopologyAuthority` define quem publica.

Fallback dedupe por:

```text
playerUuid
eventType
timeWindow
```

apenas como proteção, não arquitetura principal.

---

# 50. ROLE SYNC COOLDOWN

Config:

```yaml
roleSync:
  debounceMs: 2000
  manualCooldownSeconds: 15
  joinCooldownSeconds: 10
```

Mudanças consecutivas agrupadas em um único reconcile.

---

# 51. ROLE SYNC RESULT

```json
{
  "added": ["roleA"],
  "removed": ["roleB"],
  "unchanged": ["roleC"],
  "nicknameChanged": true,
  "conflicts": []
}
```

---

# 52. LINK CONFIRMATION COMPONENT

Discord Components V2:

```text
ALKA NETWORK • VINCULAR CONTA

Minecraft:
MestreBR

Servidor:
RankUP

Expira:
2 minutos

[Aceitar vínculo]
[Recusar]
```

`custom_id` assinado/nonce, não carrega autoridade sozinho.

---

# 53. LINK CONFLICT UX

Se Discord já vinculado:

```text
Esta conta já está vinculada a outro perfil Minecraft.

[Ver vínculo]
[Cancelar]
```

Não mostrar informações privadas de outro jogador sem autorização.

---

# 54. REWARD UX

Após primeiro link:

```text
Conta vinculada com sucesso.

Recompensas:
✓ 500 TICKS
✓ Key Vinculado
✓ Tag Discord

[Ver perfil]
```

Reward real vem de ledger/provider.

---

# 55. BOOSTER UX

```text
Obrigado por apoiar a AlkaStudio!

Boosts ativos: 2
Tier: Booster II

Benefícios sincronizados:
✓ ...
```

---

# 56. MENU MINECRAFT

Padrão AlkaCore BaseGui:

```text
27/45 slots

[Conta]
[Discord]
[Sync]
[Booster]
[Preferências]
```

Tudo data-driven/YML conforme convenções da rede.

---

# 57. WEBHOOK TEMPLATE UX

Mesmo tendo Components V2, preservar um modo de integração simples para sistemas externos:

```text
WebhookDestinationService
```

Assim site/pagamentos/monitoring podem publicar sem possuir acesso completo ao Discord Bot.

---

# 58. PAYMENT NOTIFICATIONS

Referência yPayments mostra um caso válido:

```text
compra gerada
produto
preço
gateway
referência
link
QR Code
```

No AlkaBot:

```text
PaymentNotificationProvider
```

fica genérico e opcional.

Nunca acoplar o core a um gateway específico.

---

# 59. STAFF LOGIN / SECURITY NOTIFICATION

A referência também mostra notificação de staff login.

Nosso equivalente futuro:

```text
security.staff.login.challenge
security.suspicious.login
```

Não incluir IP em mensagem pública.

Se IP for usado em segurança:

```text
ephemeral/private/security-only
```

e respeitar retenção mínima.

---

# 60. PRESENÇA

Presence frames podem usar:

```text
online players
server status
network URL
link prompt
event
```

Intervalo recomendado internamente mais conservador:

```text
30-120s
```

salvo necessidade real.

---

# 61. O QUE NÃO COPIAR — YDISCORDHOOK

## Token do bot em config Paper

Não usar:

```yaml
Bot:
  Token: ""
```

No Alka:

```text
Discord token só existe no AlkaBot.
```

## Webhook URL plaintext

Não armazenar tokens em arquivo versionável.

## Raw JDA API

Não oferecer `getJda()`.

## Lookup primário por nome

API principal usa UUID.

Nome é convenience resolver.

## Embed-only architecture

Nossa UI principal é Components V2.

Embed é compatibility renderer.

## Legacy `§` / JSON chat

Usar Adventure/MiniMessage no Minecraft.

---

# 62. O QUE NÃO COPIAR — LEAFDISCORD

## Bot por backend

Leaf consegue rodar bot local no Paper/proxy.

Para Alka, manter **uma autoridade Discord central**.

## Banco individual opcional por plugin

Não duplicar storage do Discord em cada servidor.

## Command rewards arbitrários

Não aceitar qualquer console command como primitive principal.

## 5-second presence rotation

Não necessário para produção grande.

## Chat bridge on por padrão

No Alka:

```text
disabled by default
```

e habilitado conscientemente.

---

# 63. TOPOLOGIA FINAL APÓS ADDENDUM

```text
                         DISCORD
                            │
                         AlkaBot
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
     Identity            Community          Operations
        │                   │                   │
  Link / Roles         Tickets/Chat         Network/Staff
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                        Redis/API
                            │
             ┌──────────────┴──────────────┐
             │                             │
         AlkaBridge                 AlkaProxyBridge*
          Paper 1.21+                future/optional
             │                             │
           AlkaCore                       Proxy
             │
    ┌────────┼─────────┐
    │        │         │
 Economy   RankUp    Time/VIP/Clans
```

---

# 64. ROADMAP ADDENDUM

Após os 20 commits do MASTER, acrescentar:

```text
21 feat: bidirectional linking and DM confirmation
22 feat: public AlkaDiscordService SDK
23 feat: notification/template engine
24 feat: nickname and linked-role projection
25 feat: first-link reward ledger
26 feat: booster lifecycle and reward ledger
27 feat: PlaceholderAPI expansion and Minecraft Discord menu
28 feat: configurable event relay and multi-destination routing
29 feat: optional chat bridge with AlkaChat adapter
30 feat: topology authority, proxy-ready event contracts
31 feat: bot presence service
32 test: link/booster/reward/chat dedupe scenarios
```

---

# 65. P0/P1 RECLASSIFICAÇÃO

## Entram em P0

```text
bidirectional linking
DM confirmation
linked member role
nickname sync
role sync triggers
manual role refresh
public AlkaDiscordService
PAPI basic placeholders
Minecraft /discord menu
```

## Entram em P1

```text
first-link rewards
booster lifecycle
template service
named webhook destinations
event relay
multi-destination
bot presence
```

## Entram em P2

```text
chat bridge
proxy bridge
payment notifications
advanced security notifications
```

---

# 66. ACCEPTANCE TESTS — LINKING

Adicionar:

```text
Minecraft-first success
Discord-first success
DM accept
DM deny
DM user mismatch
expired request
replay
two simultaneous requests
Discord already linked
Minecraft already linked
unlink/relink reward does not duplicate
```

---

# 67. ACCEPTANCE TESTS — ROLES

```text
link role added
unlink role removed
permission role added
permission removed -> role removed
Discord role -> LuckPerms mapping
LuckPerms -> Discord mapping
manual refresh
join refresh debounced
nickname highest priority
manual nickname override policy
hierarchy failure
```

---

# 68. ACCEPTANCE TESTS — BOOSTER

```text
0 -> 1 boost
1 -> 2 boosts
2 -> 1 boost
1 -> 0 boost
reconnect does not duplicate
unlink while booster
relink while booster
reward ledger prevents duplicate
```

---

# 69. ACCEPTANCE TESTS — TEMPLATE/WEBHOOK

```text
missing template
missing variable
invalid destination
secret missing
attachment
rate limit
DM closed
webhook failure
Components V2 validation
```

---

# 70. ACCEPTANCE TESTS — CHAT

```text
Minecraft -> Discord
Discord -> Minecraft
@everyone sanitized
loop prevented
duplicate event prevented
disabled route ignored
unlinked user denied if policy linked-only
nChat/AlkaChat adapter path
```

---

# 71. ACCEPTANCE TESTS — HYBRID NETWORK

```text
proxy join + backend join does not duplicate
server switch emits once
backend rank event still delivered
proxy offline fallback state
authority config invalid -> fail startup
```

---

# 72. MONITORING NOVO

Métricas:

```text
link_requests_total
link_success_total
link_denied_total
link_expired_total
role_sync_total
role_sync_changes_total
nickname_sync_total
reward_grants_total
reward_duplicate_prevented_total
booster_transitions_total
discord_notifications_total
discord_notification_failures_total
chat_bridge_messages_total
chat_bridge_dropped_total
event_relay_total
```

---

# 73. AUDIT EVENTS NOVOS

```text
DISCORD_LINK_REQUESTED
DISCORD_LINK_CONFIRMED
DISCORD_LINK_DENIED
DISCORD_LINK_EXPIRED
DISCORD_UNLINKED
DISCORD_ROLE_SYNCED
DISCORD_NICKNAME_SYNCED
LINK_REWARD_GRANTED
BOOSTER_STARTED
BOOSTER_CHANGED
BOOSTER_ENDED
BOOSTER_REWARD_GRANTED
DISCORD_NOTIFICATION_SENT
DISCORD_NOTIFICATION_FAILED
CHAT_BRIDGE_MESSAGE_RELAYED
WEBHOOK_DELIVERED
```

---

# 74. CONFIG NOVA

Exemplo:

```yaml
discordIntegration:

  linking:
    enabled: true
    minecraftFirst: true
    discordFirst: true
    dmConfirmation: true
    ttlSeconds: 120

  memberProjection:
    linkedRole: true
    nicknameSync: true

  roleSync:
    onLink: true
    onJoin: true
    onQuit: false
    discordToMinecraft: true
    minecraftToDiscord: true
    manualCooldownSeconds: 15

  rewards:
    firstLink: true

  booster:
    enabled: true

  chatBridge:
    enabled: false

  eventRelay:
    enabled: true

  presence:
    enabled: true
    intervalSeconds: 60
```

---

# 75. CONFIG — REWARDS

```yaml
rewards:

  first-link:
    enabled: true
    actions:
      - type: currency
        provider: AlkaTime
        currency: TICKS
        amount: "500"

  booster-1:
    enabled: true
    minBoosts: 1
    actions:
      - type: crate-key
        crate: booster
        amount: 1
```

Valores são exemplos; balanceamento real fica para configuração da Network.

---

# 76. CONFIG — ROLE MAPPING

```yaml
roleMappings:

  moderator:
    source:
      type: luckperms-group
      value: moderador

    discordRoleRef: staff-moderator

    direction: BIDIRECTIONAL

    nickname:
      enabled: true
      prefix: "[MOD] "
      priority: 500
```

---

# 77. CONFIG — EVENT ROUTES

```yaml
eventRoutes:

  player.joined:
    enabled: true
    authority: AUTO
    destinations:
      - discord:network-joins

  server.alert:
    enabled: true
    destinations:
      - discord:network-alerts
      - webhook:monitoring
```

---

# 78. CONFIG — CHAT ROUTES

```yaml
chatRoutes:

  global:
    enabled: false
    direction: BIDIRECTIONAL
    linkedOnly: true
    discordChannelRef: chat-global
    minecraftChannel: global

  staff:
    enabled: true
    direction: BIDIRECTIONAL
    discordChannelRef: chat-staff
    minecraftChannel: staff
```

---

# 79. SECURITY ADDENDUM

Todas essas features adicionam novas superfícies.

Obrigatório:

```text
link code hashed
DM button user-bound
template variable escaping
webhook secrets externalized
chat mentions disabled
chat rate limit
reward idempotency
booster lifecycle ledger
role sync origin tracking
nickname length validation
attachment size/type validation
proxy authority validation
```

---

# 80. API DESIGN PRINCIPLE

A principal lição do yDiscordHook é válida:

> outros plugins precisam de uma API simples de Discord.

A principal correção Alka é:

> essa API não deve transformar cada plugin em cliente Discord.

Portanto:

```text
Plugin Alka
   ↓
AlkaDiscordService
   ↓
AlkaBridge
   ↓
Bus
   ↓
AlkaBot
   ↓
Discord
```

---

# 81. COMPARATIVO FINAL

| Recurso | yDiscordHook | LeafDiscord | AlkaBot alvo |
|---|---|---|---|
| Vincular conta | Sim | Sim | Sim, bidirecional |
| Código/Token | Sim | Sim | Sim, hash + TTL |
| DM confirmation | Parcial/fluxo DM | Sim | Sim |
| Role sync | Sim | Sim | Sim, reconciliado |
| Discord → Minecraft role | não é foco principal | Sim | Sim |
| Nick sync | Sim | Sim | Sim |
| First-link reward | Sim | Sim | Sim, ledger |
| Booster | Sim | não explícito no config analisado | Sim |
| PAPI | Sim | softdepend | Sim |
| Minecraft menu | Sim | Sim | Sim via AlkaCore |
| Public API | Sim | arquitetura core/loader | Sim, sem raw Discord client |
| Embeds/Templates | Sim | messages/config | Components V2 + Embed compat |
| Webhooks | Sim | event channels | Sim, secret refs |
| Attachments | Sim | não confirmado | Sim |
| Chat Bridge | não é foco | Sim | Sim opcional |
| Join/Quit events | não é foco | Sim | Sim |
| Server Switch | não é foco | Sim proxy | Sim via proxy-ready contracts |
| Bungee/Velocity | docs gerais não comprovam feature | Sim | AlkaProxyBridge opcional |
| Multi-destination | webhook/channel | Sim | Sim |
| Bot Presence | Sim status simples | Sim frames | Sim |
| i18n | não central | PT/EN/ES | PT-BR/EN + extensível |
| Audit forte | limitado | não confirmado | Sim |
| Idempotência | parcial | não confirmado | Sim |
| Distributed Saga | não | não confirmado | Sim |
| Components V2 | não | não confirmado | Sim |
| Policy Engine | não | não confirmado | Sim |
| Staff platform | não | não | Sim |
| Network operations | não | parcial events | Sim |
| Game Stats Widget | não | não | Experimental |
| Activities | não | não | Future |

---

# 82. DECISÕES QUE CONTINUAM INALTERADAS

Mesmo após analisar as referências, **não mudar**:

```text
TypeScript + discord.js para AlkaBot
Java 21 + Paper para AlkaBridge
Bot externo ao Paper
Redis/contracts
Components V2
RBAC/ABAC
Audit
No free-form console
Idempotency
Correlation IDs
Feature flags
Profile Widget isolated
Modular Monolith First
```

As referências reforçam o projeto; não justificam regredir para bot embutido em cada servidor.

---

# 83. NOVO VERTICAL SLICE 4 — DISCORD INTEGRATION SDK

Depois dos três vertical slices do MASTER:

```text
AlkaRankUp
   ↓
AlkaDiscordService.notify(...)
   ↓
AlkaBridge
   ↓
Redis
   ↓
AlkaBot
   ↓
Discord DM / Components V2
```

Isso prova que qualquer plugin Alka pode usar Discord sem conhecer Discord.

---

# 84. NOVO VERTICAL SLICE 5 — ROLE PROJECTION

```text
LuckPerms group change
      ↓
AlkaBridge event
      ↓
RoleSyncService
      ↓
Discord role
      ↓
Nickname projection
      ↓
Audit
```

E sentido inverso:

```text
Discord role change
      ↓
RoleSyncService
      ↓
AlkaBridge
      ↓
LuckPerms
      ↓
Audit
```

---

# 85. NOVO VERTICAL SLICE 6 — BOOSTER

```text
Discord booster event
      ↓
DiscordBoosterService
      ↓
LinkedIdentity
      ↓
RewardPolicy
      ↓
AlkaBridge
      ↓
Provider action
      ↓
RewardLedger
      ↓
Notification
```

---

# 86. DOCUMENTOS NOVOS NO REPO

Adicionar:

```text
docs/
├── discord-linking.md
├── discord-sdk.md
├── role-projection.md
├── booster.md
├── templates.md
├── chat-bridge.md
├── topology-authority.md
└── webhook-security.md
```

ADRs:

```text
0006-bidirectional-linking.md
0007-discord-sdk-no-raw-client.md
0008-template-engine.md
0009-role-projection.md
0010-proxy-authority.md
```

---

# 87. DEFINITION OF DONE — EXTENSÕES

Além do MASTER:

```text
[ ] Link funciona nos dois sentidos
[ ] DM button bound ao usuário
[ ] Reward ledger validado
[ ] Booster lifecycle testado
[ ] Role refresh com cooldown
[ ] PAPI não faz IO bloqueante
[ ] Menu usa AlkaCore BaseGui
[ ] Public API não expõe JDA/discord.js
[ ] Templates validadas em CI
[ ] Webhook secret não está em YAML público
[ ] Chat bridge sem mention exploit
[ ] Chat bridge sem loop
[ ] Proxy/backend sem evento duplicado
```

---

# 88. REFERÊNCIAS

## yDiscordHook

Config pública:

https://github.com/yStorePlugins/configs/tree/main/yDiscordHook

Documentação:

https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook

Configuração:

https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook/configuration

Placeholders:

https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook/placeholders

API:

https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook/api

Webhooks:

https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook/configuration/webhooks

Embeds:

https://docs.ystoreplugins.com.br/docs/plugins/yDiscordHook/configuration/discord

## LeafDiscord

Artefato analisado:

```text
LeafDiscord.jar
Version: 1.1.0
```

Descritores observados:

```text
Bukkit/Paper bootstrap
Bungee bootstrap
Velocity bootstrap
Folia supported
LuckPerms softdepend
PlaceholderAPI softdepend
nChat softdepend
LegendChat softdepend
```

Arquivos de configuração analisados:

```text
config.yml
proxyconfig.yml
commands.yml
groups.yml
link-menu.yml
chat-bridge.yml
messages_pt.yml
messages_en.yml
messages_es.yml
```

---

# 89. RESULTADO

Após aplicar este addendum ao planejamento, sem modificar o MASTER original, o AlkaBot passa a cobrir também os melhores conceitos práticos encontrados em plugins consolidados de integração Discord:

```text
linking completo
role/nickname projection
rewards
boosters
SDK pública
templates
webhooks
PAPI
Minecraft UI
chat bridge
events
proxy-ready topology
i18n
presence
```

mantendo nossas vantagens arquiteturais:

```text
segurança
separação de responsabilidades
observabilidade
audit
scalability
idempotency
Components V2
multi-server contracts
staff platform
```

---

# 90. ORDEM DE USO DOS DOCUMENTOS

As IAs devem ler:

```text
1. 14 Skills Discord
2. ALKABOT_MASTER_MVP_V1.md
3. Este ADDENDUM V1.1
4. ALKA_NETWORKING_STUDIO.md
5. Docs oficiais Discord
6. Repositórios/APIs dos plugins Alka relevantes
```

Em conflito:

```text
Segurança/arquitetura do MASTER
>
Addendum
>
referências externas
```

Exceto quando documentação oficial atual mostrar incompatibilidade técnica real, caso em que a IA deve parar, documentar e propor migração — nunca alterar silenciosamente.

---

# FIM

**Nome sugerido:**

`ALKABOT_REFERENCE_AUDIT_ADDENDUM_V1_1.md`
