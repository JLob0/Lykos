package com.alkacode.bridge.heartbeat;

import com.alkacode.bridge.AlkaBridgePlugin;
import com.alkacode.bridge.config.BridgeConfig;
import com.alkacode.bridge.contract.CapabilityPayload;
import com.alkacode.bridge.contract.HeartbeatPayload;
import com.alkacode.bridge.transport.BridgeTransport;
import java.time.Instant;
import org.bukkit.scheduler.BukkitTask;

public final class HeartbeatService {

    private final AlkaBridgePlugin plugin;
    private final BridgeConfig config;
    private final BridgeTransport transport;
    private BukkitTask task;
    private Instant lastHeartbeatAt;

    public HeartbeatService(AlkaBridgePlugin plugin, BridgeConfig config, BridgeTransport transport) {
        this.plugin = plugin;
        this.config = config;
        this.transport = transport;
    }

    public void start() {
        if (!config.heartbeatEnabled()) {
            plugin.getLogger().info("[AlkaBridge] Heartbeat desativado por config.");
            return;
        }

        publishCapabilities();
        publishHeartbeat();
        task = plugin.getServer().getScheduler().runTaskTimer(plugin, this::publishHeartbeat, config.heartbeatIntervalTicks(), config.heartbeatIntervalTicks());
    }

    public void stop() {
        if (task != null) {
            task.cancel();
            task = null;
        }
    }

    public Instant getLastHeartbeatAt() {
        return lastHeartbeatAt;
    }

    private void publishCapabilities() {
        CapabilityPayload payload = CapabilityPayload.foundation(config.serverId());
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> transport.publishCapabilities(payload));
    }

    private void publishHeartbeat() {
        HeartbeatPayload payload = HeartbeatPayload.online(plugin, config);
        lastHeartbeatAt = Instant.parse(payload.timestamp());
        plugin.getServer().getScheduler().runTaskAsynchronously(plugin, () -> transport.publishHeartbeat(payload));
    }
}
