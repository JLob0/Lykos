import type { CapabilitiesPayload, HeartbeatPayload } from "../contracts/envelopes.js";

export type ServerNodeStatus = HeartbeatPayload["status"] | "UNKNOWN";

export type ServerNodeView = {
  serverId: string;
  displayName: string;
  environment: HeartbeatPayload["environment"];
  status: ServerNodeStatus;
  bridgeVersion: string;
  paperVersion: string;
  javaVersion: string;
  onlinePlayers: number;
  maxPlayers: number;
  lastHeartbeatAt: string;
  capabilities: string[];
  stale: boolean;
};

type ServerNodeRecord = {
  heartbeat: HeartbeatPayload;
  capabilities: string[];
};

export class ServerRegistry {
  private readonly servers = new Map<string, ServerNodeRecord>();

  public constructor(private readonly staleAfterMs: number) {}

  public upsertHeartbeat(payload: HeartbeatPayload): void {
    const existing = this.servers.get(payload.serverId);
    this.servers.set(payload.serverId, {
      heartbeat: payload,
      capabilities: existing?.capabilities ?? []
    });
  }

  public upsertCapabilities(payload: CapabilitiesPayload): void {
    const existing = this.servers.get(payload.serverId);
    if (existing == null) {
      return;
    }

    this.servers.set(payload.serverId, {
      heartbeat: existing.heartbeat,
      capabilities: [...payload.capabilities].sort((left, right) => left.localeCompare(right))
    });
  }

  public list(now: Date = new Date()): ServerNodeView[] {
    return [...this.servers.values()]
      .map((record) => this.toView(record, now))
      .sort((left, right) => left.serverId.localeCompare(right.serverId));
  }

  public get(serverId: string, now: Date = new Date()): ServerNodeView | undefined {
    const record = this.servers.get(serverId);
    return record == null ? undefined : this.toView(record, now);
  }

  private toView(record: ServerNodeRecord, now: Date): ServerNodeView {
    const heartbeatAt = new Date(record.heartbeat.timestamp);
    const stale = now.getTime() - heartbeatAt.getTime() > this.staleAfterMs;

    return {
      serverId: record.heartbeat.serverId,
      displayName: record.heartbeat.displayName,
      environment: record.heartbeat.environment,
      status: stale ? "UNKNOWN" : record.heartbeat.status,
      bridgeVersion: record.heartbeat.bridgeVersion,
      paperVersion: record.heartbeat.paperVersion,
      javaVersion: record.heartbeat.javaVersion,
      onlinePlayers: record.heartbeat.onlinePlayers ?? 0,
      maxPlayers: record.heartbeat.maxPlayers ?? 0,
      lastHeartbeatAt: record.heartbeat.timestamp,
      capabilities: record.capabilities,
      stale
    };
  }
}

