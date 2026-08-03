import { z } from "zod";

const cursorPayloadSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export type CreatedAtCursor = z.infer<typeof cursorPayloadSchema>;

export function encodeCreatedAtCursor(value: CreatedAtCursor): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeCreatedAtCursor(value: string | null): CreatedAtCursor | null {
  if (!value) return null;
  try {
    return cursorPayloadSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

export function createdAtCursorFilter(cursor: CreatedAtCursor): string {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}
