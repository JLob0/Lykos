package com.alkacode.bridge.transport;

public record SignedRedisMessage(
        String schema,
        String payloadJson,
        String signature,
        String signedAt
) {
}

