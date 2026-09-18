package com.alkacode.bridge;

import com.alkacode.bridge.command.AlkaBridgeCommand;
import com.alkacode.bridge.config.BridgeConfig;
import com.alkacode.bridge.heartbeat.HeartbeatService;
import com.alkacode.bridge.transport.BridgeTransport;
import com.alkacode.bridge.transport.LoggingBridgeTransport;
import com.alkacode.bridge.transport.RedisBridgeTransport;
import com.alkacode.core.plugin.AlkaPlugin;
import java.util.Objects;

public final class AlkaBridgePlugin extends AlkaPlugin {

    private BridgeConfig bridgeConfig;
    private BridgeTransport transport;
    private HeartbeatService heartbeatService;

    @Override
    protected void onPluginEnable() {
        saveDefaultConfig();
        startBridge();

        AlkaBridgeCommand command = new AlkaBridgeCommand(this);
        Objects.requireNonNull(getCommand("alkabridge"), "Comando alkabridge nao registrado no plugin.yml").setExecutor(command);
        Objects.requireNonNull(getCommand("alkabridge"), "Comando alkabridge nao registrado no plugin.yml").setTabCompleter(command);

        getLogger().info("AlkaBridge habilitado.");
    }

    @Override
    protected void onPluginDisable() {
        stopBridge();
    }

    public void reloadBridge() {
        stopBridge();
        reloadConfig();
        startBridge();
    }

    public BridgeConfig getBridgeConfig() {
        return bridgeConfig;
    }

    public HeartbeatService getHeartbeatService() {
        return heartbeatService;
    }

    private void startBridge() {
        this.bridgeConfig = BridgeConfig.from(this);
        this.transport = createTransport(bridgeConfig);
        this.heartbeatService = new HeartbeatService(this, bridgeConfig, transport);
        this.heartbeatService.start();
    }

    private BridgeTransport createTransport(BridgeConfig config) {
        if (!config.transportEnabled()) {
            return new LoggingBridgeTransport(this, config);
        }

        try {
            return new RedisBridgeTransport(this, config);
        } catch (Exception ex) {
            getLogger().warning("[AlkaBridge] Redis indisponivel; usando transporte local. Motivo: " + ex.getMessage());
            return new LoggingBridgeTransport(this, config);
        }
    }

    private void stopBridge() {
        if (heartbeatService != null) {
            heartbeatService.stop();
            heartbeatService = null;
        }

        if (transport != null) {
            transport.close();
            transport = null;
        }
    }
}
