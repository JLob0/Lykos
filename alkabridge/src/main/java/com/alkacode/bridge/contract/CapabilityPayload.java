package com.alkacode.bridge.contract;

import java.time.Instant;
import java.util.List;

public record CapabilityPayload(
        int version,
        String serverId,
        String timestamp,
        List<String> capabilities
) {

    public static CapabilityPayload foundation(String serverId) {
        return new CapabilityPayload(
                1,
                serverId,
                Instant.now().toString(),
                List.of(
                        "server.heartbeat",
                        "server.capabilities",
                        "bridge.ping",
                        "player.profile.read"
                )
        );
    }
}
