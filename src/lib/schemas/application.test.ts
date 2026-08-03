import { describe, expect, it } from "vitest";
import { applicationStatusTransitionSchema, applicationSubmitSchema } from "./application";
describe("adoption API schemas", () => {
  it("accepts only a pet ID for atomic stored-questionnaire submission", () => {
    expect(applicationSubmitSchema.safeParse({ petId: "00000000-0000-4000-8000-000000000001" }).success).toBe(true);
    expect(applicationSubmitSchema.parse({ petId: "00000000-0000-4000-8000-000000000001", answers: { private: true } })).toEqual({ petId: "00000000-0000-4000-8000-000000000001" });
  });
  it("requires private notes for rejection and return", () => {
    expect(applicationStatusTransitionSchema.safeParse({ status: "rejected" }).success).toBe(false);
    expect(applicationStatusTransitionSchema.safeParse({ status: "returned", note: "Operational reason" }).success).toBe(true);
  });
});
