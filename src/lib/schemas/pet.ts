import { z } from "zod";

export const petStatusSchema = z.enum([
  "intake",
  "medical_hold",
  "available",
  "application_pending",
  "reserved",
  "trial_adoption",
  "adopted",
  "hidden",
  "archived",
]);

export const petSpeciesSchema = z.enum(["dog", "cat", "other"]);

export const petCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  species: petSpeciesSchema,
  breed: z.string().trim().max(100).optional(),
  sex: z.enum(["female", "male", "unknown"]).default("unknown"),
  ageMonths: z.number().int().min(0).max(600).optional(),
  weightKg: z.number().positive().max(200).optional(),
  color: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  status: petStatusSchema.default("intake"),
  sterilized: z.boolean().optional(),
  microchipped: z.boolean().optional(),
  vaccinated: z.boolean().optional(),
  dewormed: z.boolean().optional(),
  personalitySummary: z.string().trim().max(5_000).optional(),
  specialCare: z.string().trim().max(5_000).optional(),
  adoptionConditions: z.string().trim().max(5_000).optional(),
});

export const petUpdateSchema = petCreateSchema
  .partial()
  .extend({
    isPublished: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided.");

export type PetStatus = z.infer<typeof petStatusSchema>;
export type PetCreateInput = z.infer<typeof petCreateSchema>;
export type PetUpdateInput = z.infer<typeof petUpdateSchema>;
