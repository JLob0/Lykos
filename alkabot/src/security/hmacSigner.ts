import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function signPayload(payload: string, secret: string): string {
  if (secret.trim().length === 0) {
    throw new Error("HMAC secret cannot be empty.");
  }

  const digest = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  return `${SIGNATURE_PREFIX}${digest}`;
}

export function verifyPayloadSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }

  const expected = signPayload(payload, secret);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(signature, "utf8");

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

