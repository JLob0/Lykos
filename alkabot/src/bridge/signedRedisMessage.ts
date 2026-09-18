import { z } from "zod";
import { verifyPayloadSignature } from "../security/hmacSigner.js";

export const signedRedisMessageSchema = z.object({
  schema: z.string().min(1),
  payloadJson: z.string().min(2),
  signature: z.string().min(32),
  signedAt: z.string().datetime()
});

export type SignedRedisMessage = z.infer<typeof signedRedisMessageSchema>;

export function parseSignedRedisMessage(raw: string, secret: string): SignedRedisMessage | undefined {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return undefined;
  }

  const parsed = signedRedisMessageSchema.safeParse(decoded);
  if (!parsed.success) {
    return undefined;
  }

  if (!verifyPayloadSignature(parsed.data.payloadJson, parsed.data.signature, secret)) {
    return undefined;
  }

  return parsed.data;
}
