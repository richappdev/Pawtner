import { z } from "zod";

import { ADMIN_PET_REVIEW_ACTIONS } from "@/lib/pets/admin-review";

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
export const petSourceTypeSchema = z.enum(["private_foster", "government"]);
export const petAgeBandSchema = z.enum(["child", "adult", "senior", "unknown"]);
export const petBodySizeSchema = z.enum(["small", "medium", "large", "unknown"]);
export const petSourceQualityStatusSchema = z.enum(["pending", "clean", "warning", "blocked"]);
export const petSourcePublicationStatusSchema = z.enum([
  "pending_review",
  "approved",
  "published",
  "held",
  "unpublished_source_change",
]);

export const petCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  species: petSpeciesSchema,
  breed: z.string().trim().max(100).optional(),
  sex: z.enum(["female", "male", "unknown"]).default("unknown"),
  ageMonths: z.number().int().min(0).max(600).optional(),
  weightKg: z.number().positive().max(200).optional(),
  color: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  ageBand: petAgeBandSchema.optional(),
  bodySize: petBodySizeSchema.optional(),
  foundLocation: z.string().trim().max(500).optional(),
  status: petStatusSchema.default("intake"),
  sterilized: z.boolean().optional(),
  microchipped: z.boolean().optional(),
  vaccinated: z.boolean().optional(),
  rabiesVaccinated: z.boolean().optional(),
  dewormed: z.boolean().optional(),
  personalitySummary: z.string().trim().max(5_000).optional(),
  specialCare: z.string().trim().max(5_000).optional(),
  adoptionConditions: z.string().trim().max(5_000).optional(),
});

export const petUpdateSchema = petCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided.");

export const adminPetListQuerySchema = z.object({
  status: petStatusSchema.optional(),
  species: petSpeciesSchema.optional(),
  source: petSourceTypeSchema.optional(),
  qualityStatus: petSourceQualityStatusSchema.optional(),
  publicationStatus: petSourcePublicationStatusSchema.optional(),
  isPublished: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
  q: z.string().trim().max(100).optional(),
  region: z.string().trim().max(80).optional(),
});

export const adminPetPageQuerySchema = adminPetListQuerySchema.extend({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z
    .enum(["10", "25", "50", "100"])
    .catch("10")
    .default("10")
    .transform((value) => Number(value)),
});

export const adminPetBulkActionSchema = z.object({
  petIds: z
    .array(z.string().uuid())
    .min(1)
    .max(100)
    .transform((petIds) => [...new Set(petIds)]),
  action: z.enum(["publish", "hide"]),
  reason: z.string().trim().max(2_000).optional(),
});

export const adminPetReviewSchema = z
  .object({
    action: z.enum(ADMIN_PET_REVIEW_ACTIONS),
    note: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "request_changes" && !value.note) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "A note is required when requesting changes.",
      });
    }
  });

export const governmentPetPublicationSchema = z
  .object({
    action: z.enum(["approve", "publish", "hold", "unpublish"]),
    reason: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (["hold", "unpublish"].includes(value.action) && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "A reason is required to hold or unpublish a listing.",
      });
    }
  });

export const adminPetPatchSchema = z
  .object({
    status: petStatusSchema.optional(),
    isPublished: z.boolean().optional(),
    displayName: z.string().trim().min(1).max(100).nullable().optional(),
    personalitySummary: z.string().trim().max(5_000).nullable().optional(),
    specialCare: z.string().trim().max(5_000).nullable().optional(),
    adoptionConditions: z.string().trim().max(5_000).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).nullable().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required.",
  });

export type PetStatus = z.infer<typeof petStatusSchema>;
export type PetSpecies = z.infer<typeof petSpeciesSchema>;
export type PetSourceType = z.infer<typeof petSourceTypeSchema>;
export type PetSourceQualityStatus = z.infer<typeof petSourceQualityStatusSchema>;
export type PetSourcePublicationStatus = z.infer<typeof petSourcePublicationStatusSchema>;
export type PetCreateInput = z.infer<typeof petCreateSchema>;
export type PetUpdateInput = z.infer<typeof petUpdateSchema>;
export type AdminPetReviewInput = z.infer<typeof adminPetReviewSchema>;
export type AdminPetPatchInput = z.infer<typeof adminPetPatchSchema>;
export type AdminPetBulkActionInput = z.infer<typeof adminPetBulkActionSchema>;
