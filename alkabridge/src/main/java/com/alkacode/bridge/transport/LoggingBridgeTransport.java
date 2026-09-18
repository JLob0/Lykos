package com.alkacode.bridge.transport;

import com.alkacode.bridge.AlkaBridgePlugin;
import com.alkacode.bridge.config.BridgeConfig;
import com.alkacode.bridge.contract.CapabilityPayload;
import com.alkacode.bridge.contract.HeartbeatPayload;

public final class LoggingBridgeTransport implements BridgeTransport {

    private final AlkaBridgePlugin plugin;
    private final BridgeConfig config;

    public LoggingBridgeTransport(AlkaBridgePlugin plugin, BridgeConfig config) {
        this.plugin = plugin;
        this.config = config;

        plugin.getLogger().info("[AlkaBridge] Transporte externo desativado. Foundation local ativa.");
    }

    @Override
    public void publishHeartbeat(HeartbeatPayload payload) {
        plugin.getLogger().fine("[AlkaBridge] Heartbeat local: " + payload.serverId() + " online=" + payload.onlinePlayers());
    }

    @Override
    public void publishCapabilities(CapabilityPayload payload) {
        plugin.getLogger().info("[AlkaBridge] Capabilities locais: " + String.join(", ", payload.capabilities()));
    }

    @Override
    public void close() {
        plugin.getLogger().fine("[AlkaBridge] Transporte local encerrado para " + config.serverId() + ".");
    }
}
