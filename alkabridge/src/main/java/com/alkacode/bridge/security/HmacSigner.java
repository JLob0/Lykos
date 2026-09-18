package com.alkacode.bridge.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class HmacSigner {

    private static final String ALGORITHM = "HmacSHA256";
    private static final String PREFIX = "sha256=";

    public String sign(String payload, String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("Secret nao pode ser vazio.");
        }

        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM));
            return PREFIX + HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Falha ao assinar payload.", ex);
        }
    }

    public boolean verify(String payload, String signature, String secret) {
        if (signature == null || signature.isBlank()) {
            return false;
        }

        String expected = sign(payload, secret);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                signature.getBytes(StandardCharsets.UTF_8)
        );
    }
}

