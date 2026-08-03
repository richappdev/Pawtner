import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "screening",
  "interview",
  "home_check",
  "trial",
  "approved",
  "adopted",
  "rejected",
  "withdrawn",
  "returned",
]);

export const applicationSubmitSchema = z.object({
  petId: z.string().uuid(),
});

export const applicationStatusTransitionSchema = z
  .object({
    status: applicationStatusSchema,
    note: z.string().trim().max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.status === "draft" || value.status === "submitted") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Applications cannot transition back to draft.",
        path: ["status"],
      });
    }
    if (["rejected", "returned"].includes(value.status) && !value.note) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A private note is required for rejection or return.",
        path: ["note"],
      });
    }
  });

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;
export type ApplicationStatusTransition = z.infer<typeof applicationStatusTransitionSchema>;
