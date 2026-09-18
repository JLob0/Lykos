package com.alkacode.bridge.contract;

public record CommandErrorPayload(
        String code,
        String message,
        boolean retryable
) {
}
