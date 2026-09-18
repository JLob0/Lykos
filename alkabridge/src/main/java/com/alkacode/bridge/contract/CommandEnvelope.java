package com.alkacode.bridge.contract;

import java.util.Map;

public record CommandEnvelope(
        String commandId,
        String correlationId,
        String command,
        int version,
        String targetServer,
        String issuedAt,
        String expiresAt,
        CommandActor actor,
        Map<String, Object> data
) {
}
