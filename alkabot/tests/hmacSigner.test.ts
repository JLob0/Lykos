import { describe, expect, it } from "vitest";
import { signPayload, verifyPayloadSignature } from "../src/security/hmacSigner.js";

describe("hmacSigner", () => {
  it("verifies a valid payload signature", () => {
    const signature = signPayload("{\"serverId\":\"rankup-01\"}", "secret-value");

    expect(verifyPayloadSignature("{\"serverId\":\"rankup-01\"}", signature, "secret-value")).toBe(true);
  });

  it("rejects tampered payloads", () => {
    const signature = signPayload("payload-a", "secret-value");

    expect(verifyPayloadSignature("payload-b", signature, "secret-value")).toBe(false);
  });
});

