package com.alkacode.bridge.config;

import com.alkacode.bridge.AlkaBridgePlugin;

public record BridgeConfig(
        String serverId,
        String displayName,
        String environment,
        boolean transportEnabled,
        String redisUrl,
        String commandQueuePrefix,
        String eventStream,
        String resultStream,
        String resultKeyPrefix,
        String heartbeatKeyPrefix,
        String capabilitiesKeyPrefix,
        long heartbeatTtlSeconds,
        long capabilitiesTtlSeconds,
        long commandResultTtlSeconds,
        String hmacSecret,
        boolean heartbeatEnabled,
        long heartbeatIntervalTicks
) {

    public static BridgeConfig from(AlkaBridgePlugin plugin) {
        String serverId = plugin.getConfig().getString("server.id", "rankup-01").trim();
        String displayName = plugin.getConfig().getString("server.display-name", "RankUP").trim();
        String environment = plugin.getConfig().getString("server.environment", "development").trim();
        boolean transportEnabled = plugin.getConfig().getBoolean("transport.enabled", false);
        String redisUrl = plugin.getConfig().getString("transport.redis.url", "redis://127.0.0.1:6379").trim();
        String commandQueuePrefix = plugin.getConfig().getString("transport.redis.command-channel-prefix", "alka:commands").trim();
        String eventStream = plugin.getConfig().getString("transport.redis.event-stream", "alka:events").trim();
        String resultStream = plugin.getConfig().getString("transport.redis.result-stream", "alka:results").trim();
        String resultKeyPrefix = plugin.getConfig().getString("transport.redis.result-key-prefix", "alka:command-results").trim();
        String heartbeatKeyPrefix = plugin.getConfig().getString("transport.redis.heartbeat-key-prefix", "alka:heartbeats").trim();
        String capabilitiesKeyPrefix = plugin.getConfig().getString("transport.redis.capabilities-key-prefix", "alka:capabilities").trim();
        long heartbeatTtlSeconds = Math.max(10L, plugin.getConfig().getLong("transport.redis.heartbeat-ttl-seconds", 30L));
        long capabilitiesTtlSeconds = Math.max(30L, plugin.getConfig().getLong("transport.redis.capabilities-ttl-seconds", 300L));
        long commandResultTtlSeconds = Math.max(30L, plugin.getConfig().getLong("transport.redis.command-result-ttl-seconds", 300L));
        String hmacSecret = plugin.getConfig().getString("transport.security.hmac-secret", "").trim();
        boolean heartbeatEnabled = plugin.getConfig().getBoolean("heartbeat.enabled", true);
        long heartbeatIntervalTicks = Math.max(20L, plugin.getConfig().getLong("heartbeat.interval-ticks", 200L));

        if (serverId.isBlank()) {
            plugin.getLogger().warning("[AlkaBridge] server.id vazio; usando rankup-01.");
            serverId = "rankup-01";
        }

        if (displayName.isBlank()) {
            displayName = serverId;
        }

        if (transportEnabled && hmacSecret.isBlank()) {
            plugin.getLogger().warning("[AlkaBridge] transport.enabled=true, mas hmac-secret esta vazio. Transporte externo ficara bloqueado ate configurar segredo.");
            transportEnabled = false;
        }

        return new BridgeConfig(
                serverId,
                displayName,
                environment,
                transportEnabled,
                redisUrl,
                commandQueuePrefix,
                eventStream,
                resultStream,
                resultKeyPrefix,
                heartbeatKeyPrefix,
                capabilitiesKeyPrefix,
                heartbeatTtlSeconds,
                capabilitiesTtlSeconds,
                commandResultTtlSeconds,
                hmacSecret,
                heartbeatEnabled,
                heartbeatIntervalTicks
        );
    }
}
