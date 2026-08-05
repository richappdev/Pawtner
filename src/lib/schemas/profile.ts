import { z } from "zod";

export const profileUpdateSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  phone: z.string().max(40).optional(),
}).strict();
