package com.alkacode.bridge.contract;

import com.alkacode.bridge.AlkaBridgePlugin;
import com.alkacode.bridge.config.BridgeConfig;
import java.time.Instant;
import org.bukkit.Bukkit;

public record HeartbeatPayload(
        int version,
        String serverId,
        String displayName,
        String environment,
        String status,
        String timestamp,
        String bridgeVersion,
        String paperVersion,
        String javaVersion,
        int onlinePlayers,
        int maxPlayers
) {

    public static HeartbeatPayload online(AlkaBridgePlugin plugin, BridgeConfig config) {
        return new HeartbeatPayload(
                1,
                config.serverId(),
                config.displayName(),
                config.environment(),
                "ONLINE",
                Instant.now().toString(),
                plugin.getPluginMeta().getVersion(),
                Bukkit.getVersion(),
                System.getProperty("java.version", "unknown"),
                Bukkit.getOnlinePlayers().size(),
                Bukkit.getMaxPlayers()
        );
    }
}
