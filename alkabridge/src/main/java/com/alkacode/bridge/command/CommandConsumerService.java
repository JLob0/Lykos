package com.alkacode.bridge.command;

import com.alkacode.bridge.AlkaBridgePlugin;
import com.alkacode.bridge.config.BridgeConfig;
import com.alkacode.bridge.contract.CommandEnvelope;
import com.alkacode.bridge.contract.CommandResultPayload;
import com.alkacode.bridge.transport.CommandCapableTransport;
import com.alkacode.bridge.transport.SignedRedisMessage;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

public final class CommandConsumerService {

    private static final String COMMAND_SCHEMA = "command-envelope.v1";
    private static final String BRIDGE_PING_COMMAND = "bridge.ping";
    private static final String STAFF_SYNC_COMMAND = "staff.sync";

    private final AlkaBridgePlugin plugin;
    private final BridgeConfig config;
    private final CommandCapableTransport transport;
    private final Gson gson = new Gson();
    private final Map<String, Long> processedCommands = new ConcurrentHashMap<>();

    private volatile boolean running;
    private Thread worker;

    public CommandConsumerService(AlkaBridgePlugin plugin, BridgeConfig config, CommandCapableTransport transport) {
        this.plugin = plugin;
        this.config = config;
        this.transport = transport;
    }

    public void start() {
        if (running) {
            return;
        }

        running = true;
        worker = new Thread(this::runLoop, "AlkaBridge-CommandConsumer");
        worker.setDaemon(true);
        worker.start();
        plugin.getLogger().info("[AlkaBridge] Consumidor de comandos Redis habilitado.");
    }

    public void stop() {
        running = false;
        if (worker != null) {
            worker.interrupt();
            worker = null;
        }
        processedCommands.clear();
    }

    private void runLoop() {
        while (running) {
            try {
                SignedRedisMessage message = transport.takeCommand(1);
                if (message == null) {
                    continue;
                }

                handleMessage(message);
            } catch (Exception ex) {
                if (running) {
                    plugin.getLogger().log(Level.WARNING, "[AlkaBridge] Falha ao consumir comando Redis.", ex);
                }
            }
        }
    }

    private void handleMessage(SignedRedisMessage message) {
        if (!COMMAND_SCHEMA.equals(message.schema())) {
            plugin.getLogger().warning("[AlkaBridge] Comando rejeitado por schema invalido: " + message.schema());
            return;
        }

        if (!transport.verifySignedMessage(message)) {
            plugin.getLogger().warning("[AlkaBridge] Comando rejeitado por assinatura HMAC invalida.");
            return;
        }

        CommandEnvelope command = parseCommand(message);
        if (command == null || !hasRequiredFields(command)) {
            plugin.getLogger().warning("[AlkaBridge] Comando rejeitado por payload malformado.");
            return;
        }

        pruneProcessedCommands();

        if (!config.serverId().equals(command.targetServer())) {
            transport.publishCommandResult(CommandResultPayload.failed(
                    command,
                    config.serverId(),
                    "TARGET_SERVER_MISMATCH",
                    "Comando direcionado para outro servidor.",
                    false
            ));
            return;
        }

        if (isExpired(command)) {
            transport.publishCommandResult(CommandResultPayload.expired(command, config.serverId()));
            return;
        }

        if (isReplay(command.commandId())) {
            transport.publishCommandResult(CommandResultPayload.failed(
                    command,
                    config.serverId(),
                    "DUPLICATE_COMMAND",
                    "Comando ja processado recentemente.",
                    false
            ));
            return;
        }

        processedCommands.put(command.commandId(), System.currentTimeMillis() + processedRetentionMillis());

        if (BRIDGE_PING_COMMAND.equals(command.command())) {
            executeBridgePing(command);
            return;
        }

        if (STAFF_SYNC_COMMAND.equals(command.command())) {
            executeStaffSync(command);
            return;
        }

        transport.publishCommandResult(CommandResultPayload.failed(
                command,
                config.serverId(),
                "UNSUPPORTED_COMMAND",
                "Comando nao suportado pelo AlkaBridge: " + command.command(),
                false
        ));
    }

    private CommandEnvelope parseCommand(SignedRedisMessage message) {
        try {
            return gson.fromJson(message.payloadJson(), CommandEnvelope.class);
        } catch (JsonSyntaxException ex) {
            plugin.getLogger().log(Level.WARNING, "[AlkaBridge] Payload de comando nao e JSON valido.", ex);
            return null;
        }
    }

    private boolean hasRequiredFields(CommandEnvelope command) {
        return notBlank(command.commandId())
                && notBlank(command.correlationId())
                && notBlank(command.command())
                && command.version() == 1
                && notBlank(command.targetServer())
                && notBlank(command.issuedAt())
                && notBlank(command.expiresAt())
                && command.actor() != null
                && command.data() != null;
    }

    private boolean isExpired(CommandEnvelope command) {
        try {
            return Instant.parse(command.expiresAt()).isBefore(Instant.now());
        } catch (DateTimeParseException ex) {
            return true;
        }
    }

    private boolean isReplay(String commandId) {
        Long expiresAt = processedCommands.get(commandId);
        return expiresAt != null && expiresAt > System.currentTimeMillis();
    }

    private void executeBridgePing(CommandEnvelope command) {
        transport.publishCommandResult(CommandResultPayload.acknowledged(command, config.serverId()));
        transport.publishCommandResult(CommandResultPayload.success(
                command,
                config.serverId(),
                Map.of(
                        "pong", true,
                        "serverId", config.serverId(),
                        "receivedAt", Instant.now().toString(),
                        "bridgeVersion", plugin.getPluginMeta().getVersion()
                )
        ));
    }

    private void executeStaffSync(CommandEnvelope command) {
        transport.publishCommandResult(CommandResultPayload.acknowledged(command, config.serverId()));

        Map<String, Object> data = command.data();
        Object syncJobId = data.get("syncJobId");
        Object staffMemberId = data.get("staffMemberId");
        Object target = data.get("target");
        Object projection = data.get("projection");

        if (!(syncJobId instanceof String syncJobIdValue) || syncJobIdValue.isBlank()
                || !(staffMemberId instanceof String staffMemberIdValue) || staffMemberIdValue.isBlank()
                || !(target instanceof Map<?, ?> targetMap)
                || !(projection instanceof Map<?, ?> projectionMap)) {
            transport.publishCommandResult(CommandResultPayload.failed(
                    command,
                    config.serverId(),
                    "INVALID_STAFF_SYNC_PAYLOAD",
                    "Payload staff.sync sem syncJobId, staffMemberId, target ou projection.",
                    false
            ));
            return;
        }

        transport.publishCommandResult(CommandResultPayload.success(
                command,
                config.serverId(),
                Map.of(
                        "accepted", true,
                        "syncJobId", syncJobIdValue,
                        "staffMemberId", staffMemberIdValue,
                        "target", targetMap,
                        "projection", projectionMap,
                        "minecraftApplied", false,
                        "mode", "PROJECTION_ACK",
                        "receivedAt", Instant.now().toString()
                )
        ));
    }

    private void pruneProcessedCommands() {
        long now = System.currentTimeMillis();
        Iterator<Map.Entry<String, Long>> iterator = processedCommands.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, Long> entry = iterator.next();
            if (entry.getValue() <= now) {
                iterator.remove();
            }
        }
    }

    private long processedRetentionMillis() {
        return Math.max(60_000L, config.commandResultTtlSeconds() * 1_000L);
    }

    private boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
