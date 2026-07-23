import { createHmac, timingSafeEqual } from "node:crypto";

export interface IdempotencyStore {
  claim(key: string): boolean | Promise<boolean>;
}

function normalizeSignature(signature: string): Buffer | null {
  const value = signature.replace(/^sha256=/i, "");

  if (!/^[a-f0-9]{64}$/i.test(value)) {
    return null;
  }

  return Buffer.from(value, "hex");
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const providedSignature = normalizeSignature(signature);
  const expectedSignature = createHmac("sha256", secret).update(payload).digest();

  return providedSignature !== null &&
    providedSignature.length === expectedSignature.length &&
    timingSafeEqual(providedSignature, expectedSignature);
}

export async function ensureIdempotentEvent(
  store: IdempotencyStore,
  provider: string,
  eventId: string,
): Promise<void> {
  if (!provider.trim() || !eventId.trim()) {
    throw new Error("Webhook provider and event ID are required.");
  }

  const accepted = await store.claim(`${provider}:${eventId}`);

  if (!accepted) {
    throw new Error(`Duplicate webhook event: ${provider}:${eventId}`);
  }
}
