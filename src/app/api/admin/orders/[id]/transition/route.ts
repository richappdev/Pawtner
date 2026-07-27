import { z } from "zod";

import { canAccessAdmin } from "@/lib/auth/permissions";
import { getSessionActor } from "@/lib/auth/session-actor";
import { jsonError, jsonOk } from "@/lib/api/http";

const schema = z.object({
  status: z.enum(["paid", "fulfilled", "shipped", "delivered", "cancelled", "refunded"]),
  note: z.string().trim().max(2_000).optional(),
  carrier: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().max(200).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionActor();
  if (!session || !canAccessAdmin(session.actor)) {
    return jsonError("Administrator access is required.", 403);
  }
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return jsonError("Invalid order ID.", 422);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid order transition.", 422, parsed.error.flatten());
  const { data, error } = await session.supabase.rpc("transition_manual_order", {
    p_order_id: id,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
    p_carrier: parsed.data.carrier ?? null,
    p_tracking_number: parsed.data.trackingNumber ?? null,
  });
  return error ? jsonError("Invalid or unauthorized order transition.", 409) : jsonOk(data);
}
