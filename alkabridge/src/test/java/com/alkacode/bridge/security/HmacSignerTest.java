package com.alkacode.bridge.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class HmacSignerTest {

    private final HmacSigner signer = new HmacSigner();

    @Test
    void signsAndVerifiesPayload() {
        String signature = signer.sign("{\"command\":\"player.profile.read\"}", "secret-value");

        assertTrue(signer.verify("{\"command\":\"player.profile.read\"}", signature, "secret-value"));
    }

    @Test
    void rejectsDifferentPayload() {
        String signature = signer.sign("payload-a", "secret-value");

        assertFalse(signer.verify("payload-b", signature, "secret-value"));
    }

    @Test
    void producesDifferentSignaturesForDifferentSecrets() {
        String first = signer.sign("payload", "secret-a");
        String second = signer.sign("payload", "secret-b");

        assertNotEquals(first, second);
    }

    @Test
    void rejectsBlankSecret() {
        assertThrows(IllegalArgumentException.class, () -> signer.sign("payload", ""));
    }
}

