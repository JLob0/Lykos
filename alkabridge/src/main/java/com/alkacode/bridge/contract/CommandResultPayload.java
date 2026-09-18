package com.alkacode.bridge.contract;

import java.time.Instant;
import java.util.Map;

public record CommandResultPayload(
        String commandId,
        String correlationId,
        String state,
        String targetServer,
        String timestamp,
        Map<String, Object> data,
        CommandErrorPayload error
) {

    public static CommandResultPayload acknowledged(CommandEnvelope command, String serverId) {
        return new CommandResultPayload(
                command.commandId(),
                command.correlationId(),
                "ACKNOWLEDGED",
                serverId,
                Instant.now().toString(),
                Map.of("command", command.command()),
                null
        );
    }

    public static CommandResultPayload success(CommandEnvelope command, String serverId, Map<String, Object> data) {
        return new CommandResultPayload(
                command.commandId(),
                command.correlationId(),
                "SUCCESS",
                serverId,
                Instant.now().toString(),
                data,
                null
        );
    }

    public static CommandResultPayload failed(CommandEnvelope command, String serverId, String code, String message, boolean retryable) {
        return new CommandResultPayload(
                command.commandId(),
                command.correlationId(),
                "FAILED",
                serverId,
                Instant.now().toString(),
                null,
                new CommandErrorPayload(code, message, retryable)
        );
    }

    public static CommandResultPayload expired(CommandEnvelope command, String serverId) {
        return new CommandResultPayload(
                command.commandId(),
                command.correlationId(),
                "EXPIRED",
                serverId,
                Instant.now().toString(),
                null,
                new CommandErrorPayload("COMMAND_EXPIRED", "O comando expirou antes de ser executado.", false)
        );
    }
}
