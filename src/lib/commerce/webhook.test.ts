import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { ensureIdempotentEvent, verifyWebhookSignature } from "./webhook";

describe("webhook helpers", () => {
  it("verifies valid HMAC SHA-256 signatures", () => {
    const payload = '{"event":"paid"}';
    const secret = "webhook-secret";
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyWebhookSignature(payload, `sha256=${signature}`, secret)).toBe(true);
    expect(verifyWebhookSignature(payload, signature, "wrong-secret")).toBe(false);
  });

  it("rejects duplicate events through an atomic claim store", async () => {
    const keys = new Set<string>();
    const store = {
      claim(key: string) {
        if (keys.has(key)) {
          return false;
        }

        keys.add(key);
        return true;
      },
    };

    await expect(ensureIdempotentEvent(store, "stripe", "evt_1")).resolves.toBeUndefined();
    await expect(ensureIdempotentEvent(store, "stripe", "evt_1")).rejects.toThrow("Duplicate webhook event");
  });
});
