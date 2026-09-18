# ALKABOT — MASTER MVP / PRODUCTION BLUEPRINT
## AlkaStudio Network — Discord ↔ Minecraft ↔ Staff ↔ Operações
### v1.0 — 18/09/2026

> **Objetivo:** especificar o AlkaBot como plataforma oficial da AlkaStudio para Discord, staff, comunidade, identidade, moderação e integração com a Network Minecraft.
>
> Este documento deve ser entregue às IAs Coder junto das 14 skills Discord já implementadas/testadas e do `ALKA_NETWORKING_STUDIO.md`.
>
> **Princípio:** não construir “um bot com comandos”. Construir uma camada segura, observável e versionada entre pessoas, Discord e os sistemas da Alka Network.

---

# 1. VISÃO

```text
                         ALKASTUDIO
                            │
              ┌─────────────┴─────────────┐
              │                           │
           Discord                     Minecraft
              │                           │
           AlkaBot                    AlkaBridge
      TypeScript / Node.js            Java / Paper
              │                           │
              └─────────────┬─────────────┘
                            │
                       Redis + DB
                            │
                 Application Services
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
       Staff             Community           Network
         │                  │                  │
      Identity           Tickets            Servers
     Moderation          Appeals            Metrics
      Profiles          Ouvidoria          Operations
```

## Componentes

### AlkaBot
Aplicação independente. Responsável por Discord, Components V2, staff, tickets, identidade, dashboards, auditoria, jobs e autorização.

### AlkaBridge
Plugin Paper Java 21+. Faz Minecraft ↔ AlkaBot. **Não conecta diretamente no Discord.**

### AlkaGateway
Na V1 é um **módulo interno** do AlkaBot. Só vira serviço separado quando escala/arquitetura justificar.

---

# 2. NÃO NEGOCIÁVEIS

1. AlkaBot não roda dentro do Paper.
2. AlkaBridge não possui token Discord.
3. Discord e Minecraft conversam por contratos versionados.
4. Proibido `/console <texto-livre>` no Discord.
5. Ações críticas: policy + confirmação + audit.
6. Discord IDs são `string`, nunca JavaScript `number`.
7. Minecraft usa UUID como identidade persistente.
8. Nunca usar nickname como chave primária.
9. Role Discord é projeção de estado, não autorização única.
10. RBAC/ABAC interno + hierarquia Discord.
11. IO/banco/Redis nunca bloqueiam main thread Paper.
12. Dados críticos nunca existem só em RAM.
13. Comandos remotos críticos são idempotentes.
14. Todo evento/comando tem versão, ID, correlation ID e timestamp.
15. APIs experimentais do Discord ficam isoladas.
16. `/setup` é idempotente e possui dry-run.
17. Nada existente é apagado silenciosamente.
18. Secrets nunca entram no Git/log.
19. Dependências são pinadas.
20. Segurança vence conveniência.

---

# 3. STACK

## AlkaBot

```yaml
runtime:
  node: ">=24.17 LTS"
language:
  typescript:
    strict: true
    module: ESM

discord:
  library: discord.js
  major: 14
  pin_exact_version: true

http:
  framework: Fastify

validation:
  library: Zod

database:
  engine: MySQL_or_MariaDB
  driver: mysql2
  pattern: Repository

cache_bus:
  redis: true

jobs:
  bullmq: true

tests:
  framework: Vitest

observability:
  structured_logs: true
  opentelemetry_ready: true

deploy:
  docker: true
```

## AlkaBridge

```yaml
java: 21
server: "Paper 1.21+"
hard_depend:
  - AlkaCore
soft_depend:
  - AlkaEconomy
  - AlkaTime
  - AlkaRankUp
  - AlkaVips
  - AlkaClans
  - AlkaTops
  - AlkaChat-Plus

transport:
  redis: true
  signed_messages: true
```

---

# 4. MODULAR MONOLITH FIRST

Não começar com dezenas de microserviços.

```text
AlkaBot
├── Discord Adapter
├── Identity
├── Profiles
├── Staff
├── Permissions
├── Moderation
├── Appeals
├── Tickets
├── Ombudsman
├── Community
├── Network
├── Server Operations
├── Minecraft Adapter
├── Audit
├── Notifications
├── Jobs
└── Experimental
```

Futuro, se necessário:

```text
AlkaBot
AlkaGateway
AlkaWorker
AlkaWeb
```

---

# 5. REPOSITÓRIO ALKABOT

```text
alkabot/
├── src/
│   ├── app/
│   │   ├── bootstrap/
│   │   ├── config/
│   │   ├── lifecycle/
│   │   └── health/
│   ├── discord/
│   │   ├── client/
│   │   ├── commands/
│   │   ├── interactions/
│   │   ├── components/
│   │   ├── modals/
│   │   ├── events/
│   │   ├── permissions/
│   │   ├── setup/
│   │   └── ui/
│   ├── domain/
│   │   ├── identity/
│   │   ├── profile/
│   │   ├── staff/
│   │   ├── moderation/
│   │   ├── tickets/
│   │   ├── community/
│   │   ├── network/
│   │   ├── economy/
│   │   └── audit/
│   ├── application/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── services/
│   │   └── policies/
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── redis/
│   │   ├── queue/
│   │   ├── http/
│   │   ├── minecraft/
│   │   └── telemetry/
│   ├── api/
│   │   └── fastify/
│   ├── experimental/
│   │   ├── profile-widget/
│   │   └── activities/
│   └── shared/
│       ├── errors/
│       ├── ids/
│       ├── logging/
│       ├── schema/
│       ├── security/
│       └── utils/
├── migrations/
├── contracts/
│   ├── events/
│   ├── commands/
│   └── responses/
├── docs/
│   ├── adr/
│   ├── runbooks/
│   └── diagrams/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   └── e2e/
├── scripts/
├── docker/
├── .github/workflows/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

# 6. REPOSITÓRIO ALKABRIDGE

```text
AlkaBridge/
└── src/main/java/com/alkastudio/bridge/
    ├── AlkaBridgePlugin.java
    ├── api/
    │   ├── BridgeApi.java
    │   ├── ProfileProvider.java
    │   ├── RankProvider.java
    │   ├── EconomyProvider.java
    │   ├── VipProvider.java
    │   ├── ClanProvider.java
    │   ├── TimeProvider.java
    │   ├── PunishmentProvider.java
    │   └── NetworkMetricsProvider.java
    ├── adapter/
    │   ├── alkacore/
    │   ├── alkaeconomy/
    │   ├── alkatime/
    │   ├── alkarankup/
    │   ├── alkavips/
    │   ├── alkaclans/
    │   └── alkatops/
    ├── bus/
    │   ├── RedisBus.java
    │   ├── EventPublisher.java
    │   ├── CommandConsumer.java
    │   └── MessageVerifier.java
    ├── command/
    ├── event/
    ├── metrics/
    ├── security/
    └── config/
```

O Bridge deve preferir APIs/Services dos plugins. Se um plugin não expõe API, criar uma read API pequena nele em vez de acoplar o Bridge a tabelas internas.

---

# 7. DOMÍNIOS

```text
Identity
Profiles
Staff
Permissions
Moderation
Appeals
Tickets
Ombudsman
Recruitment
Community
Network
Server Operations
Minecraft
Economy
Audit
Notifications
Experimental Integrations
```

---

# 8. IDENTIDADE DISCORD ↔ MINECRAFT

Modelo:

```text
DiscordUserId
      ↕
LinkedIdentity
      ↕
MinecraftUUID
```

Estados:

```text
UNLINKED → PENDING → VERIFIED → REVOKED
```

## Fluxo V1

Minecraft:

```text
/discord vincular
```

gera:

```text
ALKA-7F92K
```

Discord:

```text
/link codigo:ALKA-7F92K
```

Valida:

- código existe;
- ainda está válido;
- uso único;
- pertence ao UUID;
- Discord ID não conflita;
- UUID não conflita.

## Segurança

- código criptograficamente aleatório;
- TTL;
- hash no banco;
- rate limit;
- replay bloqueado;
- nunca logar código inteiro;
- unlink/relink auditados.

Comandos:

```text
/link
/unlink
/profile
/profile privacy
```

Minecraft:

```text
/discord vincular
/discord desvincular
/discord status
```

---

# 9. PERFIL DO JOGADOR

`/profile` usa Components V2.

Pode exibir:

```text
Nick
Rank
Prestígio/Renascimento
VIP
Clã
Tempo online
Moeda
Nível/Progressão
K/D ou stats
Servidor atual
Data de registro
Conquistas
```

Nunca público:

```text
IP
staff notes
security flags
fraud flags
private evidence
alt data
```

Privacidade:

```text
PUBLIC
GUILD_ONLY
PRIVATE
```

Campos opcionais ocultáveis:

```text
saldo
tempo
clã
VIP
stats
```

---

# 10. PROFILE WALL / GAME STATS WIDGET

```yaml
stability: experimental
core_dependency: false
release_blocker: false
```

Criar desde V1:

```text
ProfileAggregationService
```

DTO neutro:

```json
{
  "nickname": "MestreBR",
  "rank": "Imperador",
  "level": "54",
  "coins": "393990",
  "onlineTime": "312h",
  "clan": "Drakkar",
  "staff": "Founder"
}
```

Esse DTO alimenta:

1. `/profile`;
2. Components V2;
3. dashboard web futuro;
4. Profile Widget nativo se/ quando a aplicação for elegível.

**Regra:** nenhuma rota experimental/reverse-engineered pode virar dependência do core.

---

# 11. ALKA COMPONENTS V2 DESIGN SYSTEM

Criar:

```text
AlkaCard
AlkaPanel
AlkaHeader
AlkaSection
AlkaStatGrid
AlkaProfileCard
AlkaStaffCard
AlkaNetworkCard
AlkaServerCard
AlkaTicketCard
AlkaPunishmentCard
AlkaApprovalCard
AlkaConfirmDialog
AlkaPaginator
AlkaEmptyState
AlkaSuccessCard
AlkaWarningCard
AlkaErrorCard
```

`custom_id`:

```text
alka:<domain>:<action>:<resource>:<nonce>
```

Exemplo:

```text
alka:staff:promote:123:abc
alka:ticket:claim:456:def
```

Nunca IDs genéricos como `confirm`, `button1`, `yes`.

Branding:

- identidade Alka;
- acento roxo;
- PT-BR padrão;
- preparado para en-US;
- UI limpa;
- ações perigosas em estilo Danger.

---

# 12. SETUP WIZARD

```text
/setup doctor
/setup plan
/setup import
/setup roles
/setup channels
/setup permissions
/setup staff
/setup apply
/setup status
/setup repair
/setup export
```

## Doctor

Valida:

```text
Discord login
intents
permissões
hierarquia de cargos
DB
Redis
migrations
canais
role mappings
AlkaBridge
servers
drift
```

## Plan

Somente simula:

```text
Cargos novos
Canais novos
Cargos reaproveitados
Conflitos
Risco
Capacidade restante
```

## Apply

Exige:

1. dry-run;
2. confirmação;
3. snapshot;
4. audit.

Rodar 10 vezes não duplica recursos.

Persistir IDs e não depender de nomes.

---

# 13. ROLE PLANNER

Modos:

```text
LEAN
EXPANDED
FULL
```

## LEAN

Combina:

```text
Departamento + Senioridade + Liderança
```

Exemplo:

```text
Design + Sênior + Líder
```

Banco/profile pode mostrar:

```text
Líder de Design • UI/UX
```

## EXPANDED

Roles dedicadas para funções principais.

## FULL

Catálogo completo.

Antes de aplicar:

```text
currentRoles
managedRoles
projectedRoles
reservedRoles
remainingCapacity
```

Nunca consumir todo o orçamento de cargos.

---

# 14. CATÁLOGO ORGANIZACIONAL

O banco pode conhecer todas as funções mesmo que nem todas sejam roles físicas.

## Direção

```text
Fundador | Founder
Cofundador | Co-Founder
Diretor Executivo | CEO
Diretor de Operações | COO
Diretor Técnico | CTO
Diretor Criativo | CCO
Diretor de Comunidade
Diretor de Marketing
Diretor de Pessoas
```

## Gestão

```text
Staff Master
Gerente Geral
Gerente de Rede
Gerente de Servidor
Gerente de Staff
Gerente de Projetos
Coordenador
Supervisor
```

## Moderação

```text
Trainee
Ajudante Júnior
Ajudante
Moderador Júnior
Moderador
Moderador Sênior
```

## Suporte / Ouvidoria / Appeals

```text
Suporte Júnior
Suporte
Suporte Sênior
Atendente

Ouvidor Júnior
Ouvidor
Ouvidor Sênior
Analista de Ouvidoria

Revisor Júnior
Revisor
Revisor Sênior
Analista de Apelações
```

## Administração / Modalidades

```text
Administrador Júnior
Administrador
Administrador Sênior

Líder de Modalidade
Gerente de Modalidade
Administrador de Modalidade
Supervisor de Modalidade
Analista de Modalidade
```

## Desenvolvimento / Infra / Segurança

```text
Líder de Desenvolvimento
Desenvolvedor Júnior
Desenvolvedor
Desenvolvedor Sênior
Backend
Frontend
Web
Plugin Developer
Systems Developer

Líder de Infraestrutura
DevOps Júnior
DevOps
DevOps Sênior
SysAdmin
DBA
Network Engineer

Líder de Segurança
Analista de Segurança Júnior
Analista de Segurança
Analista de Segurança Sênior
Anti-Fraud
Anti-Cheat
```

## Produto

```text
Líder de Qualidade
QA Júnior
QA
QA Sênior
Tester Júnior
Tester
Tester Sênior
Beta Tester

Líder de Experiência
Analista de Experiência Júnior
Analista de Experiência
Analista de Experiência Sênior
Quality of Life Analyst

Líder de Game Design
Game Designer Júnior
Game Designer
Game Designer Sênior
Balance Analyst
Economy Designer
Progression Designer
Systems Designer

Líder de Economia
Analista de Economia Júnior
Analista de Economia
Analista de Economia Sênior
```

## Criativo

```text
Líder de Construção
Builder Júnior
Builder
Builder Sênior
Map Designer
Level Designer

Líder de Design
Designer Júnior
Designer
Designer Sênior
Graphic Designer
UI/UX Designer
2D Artist
3D Artist
Pixel Artist

Líder de Assets
Modelador 3D Júnior
Modelador 3D
Modelador 3D Sênior
Texture Artist
Asset Designer
Resource Pack Developer

Líder de Lore
Loremaker Júnior
Loremaker
Loremaker Sênior
Writer
Narrative Designer
```

## Comunidade / Crescimento

```text
Líder de Eventos
Organizador Júnior
Organizador
Organizador Sênior
Mestre de Eventos

Líder de Marketing
Marketing Júnior
Marketing
Marketing Sênior
Paid Media Manager
SEO Specialist

Líder de Conteúdo
Social Media Júnior
Social Media
Social Media Sênior
Content Creator
Video Editor
Motion Designer
Copywriter

Líder de Comunidade
Community Manager
Community Analyst Júnior
Community Analyst
Community Analyst Sênior

Líder de Parcerias
Partnerships Manager
Partnerships Analyst
Creator Manager
Influencer Manager
```

## Pessoas / Dados / Comercial

```text
Líder de RH
Gerente de RH
RH Júnior
RH
RH Sênior
Recruiter
Recruiter Júnior

Líder de Treinamento
Instrutor Júnior
Instrutor
Instrutor Sênior
Mentor

Líder de Dados
Data Analyst Júnior
Data Analyst
Data Analyst Sênior
Product Analyst

Líder Comercial
Gerente Comercial
Analista Comercial
Executivo de Vendas
```

---

# 15. CARREIRA E SENIOR SEAT

Padrão:

```text
Júnior → Pleno/sem sufixo → Sênior → Líder → Gerente → Diretor
```

Exemplo:

```text
Moderador Júnior → Moderador → Moderador Sênior
```

Regra padrão:

```yaml
senior_seat:
  max_per_department: 1
```

Se já houver Sênior:

```text
⚠ Assento de Sênior ocupado por @João.

[Planejar Substituição]
[Cancelar]
```

Nunca substituir automaticamente.

Quando vaga:

```text
VACANT
```

O bot mostra elegíveis, mas **não escolhe quem merece promoção**.

---

# 16. STAFF DOMAIN

Entidades:

```text
StaffMember
Department
Position
SeniorityLevel
StaffAssignment
StaffPromotion
StaffDemotion
StaffLeave
StaffWarning
StaffEvaluation
StaffMetricSnapshot
StaffShift
StaffNote
```

Comandos:

```text
/staff profile
/staff list
/staff department
/staff promote
/staff demote
/staff transfer
/staff suspend
/staff reinstate
/staff warning
/staff note
/staff evaluation
/staff history
/staff metrics
/staff senior-seat
/staff sync
```

Promoção:

```text
Actor
 ↓
Policy
 ↓
Hierarchy
 ↓
CareerPath
 ↓
SeatConstraint
 ↓
Preview
 ↓
Confirmation
 ↓
DB
 ↓
Discord Role
 ↓
LuckPerms
 ↓
Audit
```

Falha parcial gera:

```text
PARTIAL_FAILURE
```

e reconciliation job.

---

# 17. STAFF METRICS

Pode medir:

```text
tempo na staff
tickets resolvidos
tickets reabertos
punições
punições revertidas
appeals
atividade
eventos
relatórios
advertências
avaliações
```

Métrica é apoio.

**Proibido:** promoção automática por score.

---

# 18. PERMISSION ENGINE

Keys:

```text
alka.setup.read
alka.setup.apply

alka.staff.read
alka.staff.promote
alka.staff.demote
alka.staff.warn
alka.staff.manage_roles

alka.player.read
alka.player.kick
alka.player.mute
alka.player.ban.temp
alka.player.ban.permanent

alka.economy.read
alka.economy.adjust.small
alka.economy.adjust.large

alka.server.read
alka.server.maintenance
alka.server.restart

alka.audit.read
alka.audit.export
```

Policy recebe:

```text
actor
action
target
resource
server
department
amount
environment
```

Resultado:

```text
ALLOW
DENY
REQUIRE_CONFIRMATION
REQUIRE_SECOND_APPROVAL
```

---

# 19. APROVAÇÃO DUPLA

Usar em:

```text
ajuste econômico alto
ban permanente protegido
demotion de liderança
restart crítico
mudança massiva de roles
config sensível
```

Regras:

- requester não aprova a própria ação;
- approval expira;
- payload congelado;
- mudança gera nova solicitação;
- audit em tudo.

---

# 20. MODERAÇÃO

Interface:

```text
PunishmentProvider
```

Bot não depende permanentemente de um plugin específico.

Comandos:

```text
/player profile
/player online
/player server
/player kick
/player mute
/player unmute
/player warn
/player ban
/player unban
/player jail
/player history
```

Regras:

- motivo obrigatório;
- duração validada;
- confirmation em permanente;
- evidência opcional;
- punição global/modalidade;
- audit;
- proteção de hierarchy.

---

# 21. APPEALS

Estados:

```text
OPEN
ASSIGNED
UNDER_REVIEW
WAITING_USER
APPROVED
DENIED
CANCELLED
```

Comandos:

```text
/appeal open
/appeal assign
/appeal request-info
/appeal approve
/appeal deny
/appeal history
```

Sinalizar conflito se reviewer analisar punição própria.

---

# 22. OUVIDORIA

Separada de moderação.

Casos:

```text
conduta da staff
atendimento
processo interno
experiência recorrente
feedback sensível
problema sistêmico
```

Estados:

```text
OPEN → TRIAGED → ASSIGNED → INVESTIGATING → RESOLVED → ARCHIVED
```

---

# 23. TICKETS

Tipos:

```text
SUPPORT
REPORT_PLAYER
BUG
PURCHASE
APPEAL
OMBUDSMAN
PARTNERSHIP
STAFF_APPLICATION
OTHER
```

Política:

```yaml
claim:
  resolver_only: true
  max_assignees: 2
```

Comandos:

```text
/ticket open
/ticket claim
/ticket unclaim
/ticket add
/ticket remove
/ticket transfer
/ticket close
/ticket reopen
/ticket transcript
/ticket priority
/ticket tag
```

Transcript salva metadados estruturados e gera export quando autorizado.

---

# 24. RECRUTAMENTO

Pipeline:

```text
SUBMITTED → SCREENING → INTERVIEW → TRIAL → ACCEPTED/REJECTED
```

Entidades:

```text
Application
Question
Answer
Review
Interview
Decision
```

Components V2 + modals na V1/P1; web form opcional depois.

---

# 25. NETWORK STATUS

`/network status`:

```text
Proxy
Modalidades
Players
TPS
MSPT
Memória
Uptime
Bridge heartbeat
Version
Maintenance
```

Estados:

```text
ONLINE
DEGRADED
MAINTENANCE
OFFLINE
UNKNOWN
```

Servidor sem heartbeat primeiro vira `UNKNOWN`, não “crash confirmado”.

---

# 26. SERVER REGISTRY

`ServerNode`:

```text
serverId
displayName
mode
environment
bridgeVersion
paperVersion
javaVersion
status
maintenance
lastHeartbeatAt
capabilities
```

Exemplos:

```text
proxy-01
lobby-01
rankup-01
survival-01
skyblock-01
```

---

# 27. HEARTBEAT

Exemplo:

```json
{
  "event": "server.heartbeat",
  "version": 1,
  "serverId": "rankup-01",
  "timestamp": "2026-09-18T15:00:00Z",
  "data": {
    "onlinePlayers": 512,
    "maxPlayers": 2000,
    "tps": 19.95,
    "mspt": 18.4,
    "memoryUsedMb": 4096,
    "uptimeSeconds": 123456,
    "maintenance": false
  }
}
```

Não publicar por tick.

---

# 28. SERVER OPERATIONS

```text
/server status
/server players
/server announce
/server maintenance
/server restart
/server drain
/server info
/server plugins
```

**Sem console livre.**

Restart:

```text
request
 ↓
policy
 ↓
confirmation
 ↓
drain
 ↓
notify
 ↓
move/finish
 ↓
restart
 ↓
verify heartbeat
 ↓
audit
```

---

# 29. PROVIDERS DO BRIDGE

Java:

```java
public interface ProfileProvider {
    CompletableFuture<PlayerProfileSnapshot> snapshot(UUID playerId);
}
```

Também:

```text
RankProvider
VipProvider
EconomyProvider
TimeProvider
ClanProvider
StatsProvider
PunishmentProvider
NetworkMetricsProvider
```

Cada provider informa:

```text
capability
version
availability
```

---

# 30. CAPABILITIES

Bridge anuncia:

```json
{
  "serverId": "rankup-01",
  "capabilities": [
    "profile",
    "economy.read",
    "rank.read",
    "rank.events",
    "vip.read",
    "time.read",
    "clan.read",
    "player.kick"
  ]
}
```

Bot só exibe ações suportadas.

---

# 31. ECONOMIA

Leitura habilitada.

Escrita:

```text
DISABLED BY DEFAULT
```

até policy/provider configurados.

```text
/economy balance
/economy history
/economy adjust
/economy freeze
/economy inspect
```

`EconomyAdjustment` contém:

```text
currency
amount
reason
actor
target
serverScope
approval
before
after
```

Precisão: domínio monetário preserva `BigDecimal`/decimal exato; não confiar em `double`.

---

# 32. LUCKPERMS ↔ DISCORD

Mapping:

```yaml
moderator:
  discordRoleId: "..."
  luckPermsGroup: "moderador"
  direction: BIDIRECTIONAL
```

Direções:

```text
DISCORD_TO_MINECRAFT
MINECRAFT_TO_DISCORD
BIDIRECTIONAL
MANUAL
```

Prevenir loops com:

```text
origin
correlationId
version
```

---

# 33. DRIFT RECONCILIATION

Compara:

```text
DB esperado
vs
Discord atual
vs
LuckPerms atual
```

Resultados:

```text
IN_SYNC
MISSING_DISCORD_ROLE
MISSING_LP_GROUP
CONFLICT
MANUAL_OVERRIDE
```

Comandos:

```text
/sync scan
/sync plan
/sync apply
```

Nada destrutivo automático sem policy.

---

# 34. EVENT ENVELOPE

```json
{
  "eventId": "01K...",
  "correlationId": "01K...",
  "event": "player.rank.changed",
  "version": 1,
  "source": "rankup-01",
  "timestamp": "2026-09-18T15:00:00Z",
  "actor": {
    "type": "SYSTEM",
    "id": "alkarankup"
  },
  "data": {}
}
```

Obrigatórios:

```text
eventId
correlationId
event
version
source
timestamp
data
```

---

# 35. COMMAND ENVELOPE

```json
{
  "commandId": "01K...",
  "correlationId": "01K...",
  "command": "player.kick",
  "version": 1,
  "targetServer": "rankup-01",
  "issuedAt": "...",
  "expiresAt": "...",
  "actor": {
    "discordUserId": "...",
    "staffMemberId": "...",
    "permissionsSnapshot": ["alka.player.kick"]
  },
  "data": {
    "playerUuid": "...",
    "reason": "..."
  },
  "signature": "..."
}
```

Estados:

```text
PENDING
DISPATCHED
ACKNOWLEDGED
SUCCESS
FAILED
EXPIRED
PARTIAL_FAILURE
```

---

# 36. REDIS

Namespaces:

```text
alka:events
alka:commands:<serverId>
alka:results
alka:heartbeats
alka:presence
alka:locks
alka:jobs
```

Uso:

- Pub/Sub: informação efêmera;
- Streams/queue: eventos/comandos que não podem sumir;
- BullMQ: jobs do bot.

Não usar Pub/Sub puro para ações críticas.

---

# 37. SEGURANÇA DO BRIDGE

Cada node:

```text
serverId
secret
allowedCapabilities
environment
```

Validar:

```text
signature
timestamp
nonce
expiration
serverId
schema
commandId
```

Redis:

- ACL;
- TLS quando necessário;
- usuários separados;
- mínimo privilégio.

---

# 38. AUDIT

Eventos típicos:

```text
STAFF_PROMOTED
STAFF_DEMOTED
ROLE_CHANGED
PLAYER_BANNED
PLAYER_MUTED
ECONOMY_ADJUSTED
SERVER_RESTARTED
MAINTENANCE_CHANGED
TICKET_CLAIMED
APPEAL_DECIDED
CONFIG_CHANGED
LINK_CREATED
LINK_REMOVED
APPROVAL_CREATED
APPROVAL_APPROVED
```

Campos:

```text
auditId
timestamp
actor
action
resourceType
resourceId
target
before
after
reason
origin
serverId
correlationId
status
metadata
```

Discord mostra uma projeção bonita; **o banco é a fonte do audit**.

---

# 39. LOG CHANNELS

Configuráveis por ID:

```text
#logs-staff
#logs-moderacao
#logs-economia
#logs-servidores
#logs-seguranca
#logs-tickets
#logs-bot
#alertas-network
```

---

# 40. ALERTAS

Severidade:

```text
INFO
NOTICE
WARNING
CRITICAL
```

Exemplos:

```text
Bridge offline
TPS/MSPT degradado
Redis down
DB down
queue backlog
role drift
unauthorized attempt
economy anomaly
```

Anti-spam:

- dedupe;
- cooldown;
- grouping;
- recovery message.

---

# 41. COMMAND CATALOG

```text
/setup
/link
/unlink
/profile
/staff
/player
/network
/server
/ticket
/appeal
/ouvidoria
/economy
/sync
/audit
/config
/help
```

---

# 42. UI — NETWORK

```text
ALKASTUDIO • NETWORK

Status: ONLINE
Players: 8.432
Nodes: 15/15
Critical alerts: 0

[Servidores]
[Performance]
[Players]
[Alertas]
```

---

# 43. UI — STAFF

```text
ALKASTUDIO • STAFF

Ativos: 42
Departamentos: 11
Senior seats vagos: 2
Pendências: 5

[Equipe]
[Promoções]
[Tickets]
[Avaliações]
[Histórico]
```

---

# 44. UI — PLAYER

```text
MestreBR
Imperador

Rank      Imperador
VIP       Drakkar
Clan      Wolves
Tempo     438h
Coins     4.2M
Servidor  RankUP

[Detalhes]
[Rankings]
```

---

# 45. UI — AÇÃO CRÍTICA

```text
⚠ RESTART DE PRODUÇÃO

Servidor: rankup-01
Players: 812
Solicitante: @MestreBR

[Confirmar Restart]
[Cancelar]
```

---

# 46. NOTIFICAÇÕES

Opt-in:

```text
VIP expirando
rank alcançado
ticket respondido
appeal atualizado
compra entregue
evento
clan invite
```

Nunca DM spam.

---

# 47. EVENTOS DA NETWORK

Módulo futuro/P1:

```text
NetworkEvent
EventSchedule
EventParticipant
EventReward
```

Bot pode anunciar, lembrar, receber inscrição e acionar reward tipado/autorizado.

---

# 48. ALKAAJUDANTEBOT

Futuro:

```text
/ajuda pergunta:<texto>
```

Criar `KnowledgeProvider`.

Não fundir runtimes na V1.

---

# 49. CHAT BRIDGE

Futuro e opt-in:

```text
Discord #chat-global ↔ AlkaChat-Plus
```

Exige:

- identidade vinculada;
- sanitização;
- anti-mention;
- rate limit;
- filtros;
- origem clara.

---

# 50. FEATURE FLAGS

```yaml
features:
  staff: true
  tickets: true
  appeals: true
  ombudsman: true
  economy_write: false
  server_restart: false
  chat_bridge: false
  profile_widget: false
  activities: false
```

---

# 51. DATABASE TABLES

## Identity

```text
discord_accounts
minecraft_accounts
linked_identities
link_codes
```

## Staff

```text
staff_members
staff_departments
staff_positions
staff_assignments
staff_history
staff_warnings
staff_evaluations
staff_metric_snapshots
```

## Discord

```text
discord_guilds
discord_role_mappings
discord_channel_mappings
discord_setup_runs
```

## Moderation

```text
punishments
punishment_evidence
appeals
appeal_events
```

## Tickets

```text
tickets
ticket_members
ticket_events
ticket_transcripts
```

## Operations

```text
server_nodes
server_heartbeats
remote_commands
remote_command_results
approval_requests
audit_events
```

## Preferences

```text
user_privacy_settings
notification_preferences
feature_flags
```

---

# 52. INTERNAL API

```text
GET  /health/live
GET  /health/ready
GET  /metrics

GET  /internal/v1/servers
GET  /internal/v1/players/:uuid/profile

POST /internal/v1/link/validate
POST /internal/v1/events
```

`/internal` exige autenticação.

---

# 53. HEALTH

## Liveness
Processo vivo.

## Readiness

```text
Discord READY
DB OK
Redis OK
migrations OK
```

Bridge de um server offline não derruba readiness do bot inteiro.

---

# 54. INTERACTION LIFECYCLE

```text
validate schema
 ↓
authorize
 ↓
reply/defer quickly
 ↓
execute
 ↓
edit/follow-up
 ↓
audit
```

Handlers lentos devem deferir imediatamente.

---

# 55. ERROR MODEL

```text
ValidationError
AuthorizationError
HierarchyError
NotFoundError
ConflictError
RateLimitError
BridgeUnavailableError
CapabilityUnavailableError
ApprovalRequiredError
PartialFailureError
ExternalServiceError
```

Usuário recebe mensagem útil + correlation ID, nunca stack trace.

---

# 56. IDEMPOTÊNCIA / SAGA

Discord + Minecraft não têm transaction única.

Promoção distribuída:

```text
DB PREPARED
 ↓
Discord updated
 ↓
Minecraft updated
 ↓
DB COMMITTED
```

Se falhar no meio:

```text
PARTIAL_FAILURE
reconciliation job
alert
audit
```

Não fingir atomicidade.

---

# 57. SECURITY

## Discord

- token fora do repo;
- mínimo privilégio;
- sem Administrator por padrão;
- hierarchy check;
- ephemeral em dados sensíveis;
- allowed_mentions restritivo;
- sanitizar input;
- rate limit por actor/action.

## Minecraft

- command types allowlisted;
- UUID validado;
- capability validada;
- HMAC/assinatura;
- expiration;
- replay protection;
- idempotency.

## Database

- usuário limitado;
- queries parametrizadas;
- backup;
- migration control.

---

# 58. OBSERVABILIDADE

Logs estruturados:

```json
{
  "level": "info",
  "event": "staff.promote",
  "correlationId": "...",
  "actorId": "...",
  "targetId": "...",
  "durationMs": 84
}
```

Métricas:

```text
discord_interactions_total
discord_interaction_latency_ms
discord_errors_total
bridge_commands_total
bridge_command_latency_ms
bridge_command_failures_total
redis_errors_total
db_query_latency_ms
job_queue_depth
job_failures_total
active_tickets
online_servers
online_players
role_drift_total
```

---

# 59. CI

Pipeline:

```text
install
lint
typecheck
unit tests
integration tests
contract tests
build
dependency audit
docker build
```

Merge bloqueado se falhar.

---

# 60. CONTRACT TESTS

JSON Schemas compartilhados em:

```text
contracts/
```

Java e TS precisam ler os mesmos fixtures.

Breaking contract:

```text
version: 2
```

Nunca mudar V1 silenciosamente.

---

# 61. TESTES OBRIGATÓRIOS

```text
duplicate promotion
Redis reconnect
Discord role missing
hierarchy invalid
Bridge offline
DB timeout
Discord 429
expired command
duplicate event
invalid signature
stale heartbeat
two seniors conflict
link replay
self approval
partial Discord/LuckPerms failure
```

Load tests internos:

```text
10k linked identities
15+ bridge nodes
burst joins
mass profile reads
mass reconciliation
large ticket history
```

Sem fazer stress indevido na API real do Discord.

---

# 62. DEPLOY

V1:

```text
Docker Host
├── alkabot
├── redis
└── monitoring optional

Central DB
└── MariaDB/MySQL

Minecraft nodes
└── AlkaBridge
```

Ambientes:

```text
DEV
STAGING
PRODUCTION
```

Tokens/DB/Redis separados.

---

# 63. CONFIG EXAMPLE

```env
NODE_ENV=production
DISCORD_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
DATABASE_URL=
REDIS_URL=
ALKABOT_ENV=production
ALKABOT_LOG_LEVEL=info
```

Bridge:

```yaml
server:
  id: rankup-01
  display-name: RankUP
  environment: production

redis:
  uri: ${REDIS_URI}

security:
  secret: ${ALKA_BRIDGE_SECRET}

features:
  profile: true
  economy-read: true
  economy-write: false
  staff-sync: true
  server-operations: true
```

---

# 64. STARTUP

Bot:

```text
config
logger
DB
migrations
Redis
repositories
services
Discord handlers
Discord login
workers
HTTP
ready
```

Bridge:

```text
AlkaCore
config
transport
providers
command handlers
capabilities
heartbeat
```

---

# 65. DATA OWNERSHIP

```text
AlkaBot       → Discord/staff/tickets/linking/audit
AlkaEconomy   → economy
AlkaTime      → playtime
AlkaRankUp    → rank/prestige
AlkaVips      → VIP
AlkaClans     → clan
LuckPerms     → Minecraft permission projection
Discord Roles → Discord projection
```

Bot não vira dono de todos os domínios.

---

# 66. INTEGRAÇÕES PRIORITÁRIAS

P0:

```text
AlkaCore
AlkaEconomy
AlkaTime
AlkaRankUp
AlkaVips
AlkaClans
LuckPerms
```

P1:

```text
AlkaTops
AlkaChat-Plus
AlkaEssentials
AlkaAnti-Lag
AlkaX1
Punishment provider
```

P2:

```text
AlkaCrates
AlkaFish
AlkaMines
AlkaKits
AlkaTrade
AlkaBackpack
AlkaMarriage
AlkaFlair
AlkaEffects
AlkaItems
```

---

# 67. EVENTOS MINECRAFT

Prioritários:

```text
player.joined
player.left
player.server.changed
player.rank.changed
player.vip.changed
player.clan.changed
player.punished
player.unpunished
player.economy.changed
server.heartbeat
server.maintenance.changed
server.started
server.stopping
```

Não transformar em event bus:

```text
block break comum
movimento
cada mob kill
cada leitura de saldo
cada mensagem parcial
```

---

# 68. PRESENÇA DE PLAYER

Manter directory:

```text
playerUuid -> serverId
```

Atualiza por:

```text
join
quit
server switch
heartbeat reconciliation
```

Evita consultar 15 servers em toda busca.

---

# 69. CACHES

Profile pode ter cache curto.

Invalidar por evento:

```text
rank.changed
vip.changed
clan.changed
economy.changed
time.snapshot
```

Cache não é autoridade para mutação crítica.

---

# 70. ROLE DRIFT E MANUAL OVERRIDE

Se humano alterar role manualmente:

```text
ALERT_ONLY
IMPORT
REVERT
ASK
```

Padrão:

```text
ASK
```

Bot só gerencia resources marcados como `managed_by_alka`.

---

# 71. NO ANTI-PATTERNS

Proibido:

```text
interactionCreate.ts de 2000 linhas
switch gigante de comandos
SQL em command handler
Redis no domain
discord.js no domain
console remoto livre
IDs mágicos
role names como chave persistente
secrets no config commitado
API experimental no core
```

---

# 72. PORTS

Interfaces:

```text
DiscordRolePort
DiscordChannelPort
MinecraftCommandPort
AuditPort
NotificationPort
IdentityRepository
StaffRepository
TicketRepository
ProfileProvider
ServerRegistry
```

Domain/Application não importam discord.js nem Redis.

---

# 73. COMMAND REGISTRATION

Dev:

```text
guild commands
```

Prod:

```text
global/guild conforme necessidade
```

Script:

```text
scripts/register-commands.ts
```

Não re-registrar tudo em cada startup.

---

# 74. HELP

`/help` é contextual.

Moderador vê moderação/tickets.

Dev vê network/health.

Nunca listar ferramentas sem permissão.

---

# 75. I18N

```text
locales/
├── pt-BR.json
└── en-US.json
```

Código em inglês; UI PT-BR default.

---

# 76. TIME

Banco em UTC.

Exibição operacional configurável para:

```text
America/Sao_Paulo
```

---

# 77. MVP P0 — FUNDAÇÃO REAL

Antes de chamar a base de pronta:

```text
Bootstrap TS
Config
DB migrations
Redis
Discord client

Components V2 design system

/setup doctor
/setup plan
/setup import
/setup apply

Identity link/unlink
/player profile

Staff domain
/staff profile
/staff promote
/staff demote
senior-seat

Role sync
LuckPerms sync

AlkaBridge
signed transport
heartbeats
capabilities
profile providers

/network status

Audit
Security policies
Health endpoints
CI/tests
```

---

# 78. P1 — OPERAÇÃO

```text
Tickets
Ouvidoria
Appeals
Moderation
Staff warnings
Staff evaluations
Alerts
Maintenance
Safe restart
Advanced profile
Notifications
Role reconciliation
```

---

# 79. P2 — EXPANSÃO

```text
Economy mutations
Dual approvals
Recruitment
Events
Chat bridge
AlkaAjudanteBot integration
Advanced metrics
Web dashboard
```

---

# 80. EXPERIMENTAL

```text
Profile Wall / Game Stats Widget
Discord Activities
```

Nunca bloqueiam release central.

---

# 81. PRIMEIROS 20 COMMITS

```text
01 chore: bootstrap TS strict + lint + test + config
02 feat: lifecycle, logging and typed errors
03 feat: database migrations and repositories
04 feat: redis transport and schemas
05 feat: discord client and interaction router
06 feat: components v2 Alka design system
07 feat: policy engine and audit
08 feat: setup doctor and dry-run
09 feat: role planner + import/apply
10 feat: linked identity
11 feat: profile aggregation
12 feat: staff domain and career paths
13 feat: promotion/demotion + senior seat
14 feat: AlkaBridge + signed transport
15 feat: bridge heartbeat + capabilities
16 feat: Minecraft profile providers
17 feat: Discord/LuckPerms reconciliation
18 feat: network dashboard
19 test: distributed failure scenarios
20 docs: production runbooks/release
```

---

# 82. DEFINITION OF DONE

```text
[ ] typecheck
[ ] lint
[ ] unit test
[ ] integration test quando aplicável
[ ] contract test se cruza Bridge
[ ] permission review
[ ] audit definido
[ ] error handling
[ ] idempotency analisada
[ ] retry analisado
[ ] Components V2 review
[ ] sem secrets
[ ] config/docs atualizados
[ ] Discord sandbox testado
[ ] Paper test server testado quando aplicável
```

---

# 83. RELEASE CHECKLIST

```text
[ ] DB backup
[ ] migrations checked
[ ] Redis OK
[ ] Discord permissions OK
[ ] role hierarchy OK
[ ] Bridge keys OK
[ ] staging passou
[ ] smoke tests
[ ] rollback image disponível
[ ] logs/metrics ativos
[ ] feature flags conservadoras
```

---

# 84. RUNBOOKS

Obrigatórios:

```text
token-leak.md
redis-down.md
db-down.md
bridge-offline.md
role-drift.md
bad-deploy.md
```

---

# 85. ADRs

```text
0001-typescript-discordjs.md
0002-modular-monolith.md
0003-redis-transport.md
0004-no-console-command.md
0005-profile-widget-experimental.md
```

Formato:

```text
Context
Decision
Consequences
Alternatives
```

---

# 86. VERTICAL SLICE 1 — IDENTITY

```text
Minecraft
 /discord vincular
      ↓
AlkaBridge
      ↓
Redis
      ↓
AlkaBot
      ↓
/link
      ↓
DB
      ↓
/profile
      ↓
Providers
      ↓
Components V2
```

Prova Discord + Redis + DB + Bridge + UI + contracts.

---

# 87. VERTICAL SLICE 2 — STAFF

```text
/staff promote
      ↓
Policy
      ↓
CareerPath
      ↓
SeniorSeat
      ↓
Confirmation
      ↓
Discord Role
      ↓
AlkaBridge
      ↓
LuckPerms
      ↓
Audit
```

Prova operação distribuída.

---

# 88. VERTICAL SLICE 3 — NETWORK

```text
Bridge heartbeat
      ↓
Redis
      ↓
ServerRegistry
      ↓
/network status
      ↓
Components V2
```

Prova operação/observabilidade.

---

# 89. ACCEPTANCE — SETUP

Passa se:

1. sem permissão → não altera;
2. dry-run mostra plano;
3. apply não duplica;
4. rerun continua idempotente;
5. import mapeia existente;
6. restart preserva mappings;
7. hierarchy inválida explica erro.

---

# 90. ACCEPTANCE — LINK

Passa se:

1. Minecraft gera código;
2. código expira;
3. Discord vincula;
4. replay falha;
5. profile resolve UUID;
6. unlink audita;
7. conflito não sobrescreve silenciosamente.

---

# 91. ACCEPTANCE — STAFF

Passa se:

1. profile abre;
2. career path resolve;
3. segundo Senior bloqueia;
4. DB atualiza;
5. Discord Role atualiza;
6. LuckPerms atualiza;
7. audit registra;
8. partial failure detectado;
9. reconcile repara.

---

# 92. ACCEPTANCE — SECURITY

Passa se:

1. assinatura inválida rejeitada;
2. comando expirado rejeitado;
3. duplicate não executa 2x;
4. sem policy = deny;
5. self-approval = deny;
6. console livre inexistente;
7. secrets ausentes nos logs.

---

# 93. NON-GOALS V1

```text
IA autônoma punindo
microserviços excessivos
Kubernetes
Kafka
console remoto arbitrário
Profile Widget como dependência
Activity como dependência
dashboard web gigante
reimplementar todos os plugins
```

---

# 94. SOURCES — DISCORD

- Developer Docs  
  https://docs.discord.com/developers/intro

- Components V2 Reference  
  https://docs.discord.com/developers/components/reference

- Application Commands  
  https://docs.discord.com/developers/interactions/application-commands

- Receiving/Responding  
  https://docs.discord.com/developers/interactions/receiving-and-responding

- Gateway  
  https://docs.discord.com/developers/events/gateway

- Permissions  
  https://docs.discord.com/developers/topics/permissions

- Rate Limits  
  https://docs.discord.com/developers/topics/rate-limits

- OAuth2  
  https://docs.discord.com/developers/topics/oauth2

- Developer Portal  
  https://discord.com/developers/applications

- Developer Newsletter  
  https://discord.com/developers/developer-newsletter

- September 2026 / Game Stats Widget  
  https://discord.com/developer-newsletter/september-2026

- Profile Widgets FAQ  
  https://support.discord.com/hc/en-us/articles/35344672307607-Profile-Widgets-FAQ

- Social SDK  
  https://discord.com/developers/docs/social-sdk/index.html

- Activities  
  https://discord.com/developers/docs/activities/overview

---

# 95. SOURCES — STACK

- discord.js  
  https://discordjs.dev/

- discord.js Guide  
  https://discordjs.guide/

- discord.js GitHub  
  https://github.com/discordjs/discord.js

- Node.js  
  https://nodejs.org/

- TypeScript  
  https://www.typescriptlang.org/docs/

- Fastify  
  https://fastify.dev/

- Redis  
  https://redis.io/docs/latest/

- BullMQ  
  https://docs.bullmq.io/

- Zod  
  https://zod.dev/

- Vitest  
  https://vitest.dev/

- OpenTelemetry  
  https://opentelemetry.io/

- Paper  
  https://docs.papermc.io/

---

# 96. WIDGET RESEARCH

- TCNO Discord Widgets  
  https://hub.tcno.co/discord/widgets/

Tratar como pesquisa técnica/experimental; documentação oficial do Discord tem prioridade.

---

# 97. EXECUTION CONTRACT PARA AS IAs

Ao implementar:

1. carregar as 14 skills Discord relevantes;
2. ler este documento;
3. ler `ALKA_NETWORKING_STUDIO.md`;
4. não mudar targets sem autorização;
5. não inventar API de plugin;
6. criar interface/adapter quando integração real não existe;
7. consultar docs oficiais para API Discord sensível;
8. trabalhar em commits pequenos;
9. testar a cada etapa;
10. não refatorar coisas fora do escopo;
11. não expor secrets;
12. nunca criar console remoto livre;
13. experimental nunca entra no core;
14. contract tests Java ↔ TypeScript;
15. registrar ADR em decisão estrutural;
16. reportar incompatibilidade real em vez de “resolver” silenciosamente.

---

# 98. PRIMEIRA ENTREGA DA IA

Antes de dezenas de features:

```text
alkabot/
alkabridge/
contracts/
docker-compose.dev.yml
docs/architecture.md
docs/security.md
docs/adr/*
```

Ambiente DEV:

```text
Bot conectado ao Discord sandbox
DB conectado
Redis conectado
Bridge sandbox conectado
/health ready
/setup doctor
/network health
```

---

# 99. RESULTADO P0 + P1

Ao final:

- Bot próprio da AlkaStudio;
- Components V2 padronizados;
- setup seguro;
- gestão de roles;
- staff com carreira;
- 1 Sênior por setor configurável;
- Discord ↔ Minecraft linkados;
- LuckPerms ↔ Discord sync;
- player profiles;
- network status;
- tickets;
- ouvidoria;
- appeals;
- moderação;
- server operations seguras;
- audit trail;
- approvals;
- alertas;
- arquitetura para 15+ modalidades;
- base pronta para Game Stats Widget;
- base pronta para Discord Activities;
- base pronta para dashboard web futuro.

---

# 100. FRASE-GUIA

> **O AlkaBot não deve ser o bot que “consegue executar qualquer coisa”. Ele deve ser a plataforma que executa somente o que foi explicitamente modelado, autorizado, auditado e testado — conectando Discord, Minecraft e a equipe da AlkaStudio com segurança e escala.**

---

# FIM

**Arquivo:** `ALKABOT_MASTER_MVP_V1.md`

Prioridade: concluir P0, validar os três vertical slices e somente depois expandir P1/P2.
