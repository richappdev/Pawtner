import { z } from "zod";

export const aiContentKindSchema = z.enum([
  "pet_description",
  "application_summary",
  "support_reply",
  "other",
]);

export const aiGenerateRequestSchema = z.object({
  kind: aiContentKindSchema,
  input: z.record(z.string(), z.unknown()),
  instructions: z.string().trim().min(1).max(4_000).optional(),
});

export const aiReviewRequestSchema = z.object({
  contentId: z.string().uuid(),
  approved: z.boolean(),
  reviewerNote: z.string().trim().max(2_000).optional(),
}).superRefine((value, context) => {
  if (!value.approved && !value.reviewerNote) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A reviewer note is required when rejecting AI content.",
      path: ["reviewerNote"],
    });
  }
});

export type AiGenerateRequest = z.infer<typeof aiGenerateRequestSchema>;
export type AiReviewRequest = z.infer<typeof aiReviewRequestSchema>;
