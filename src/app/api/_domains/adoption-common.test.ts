import { describe, expect, it } from "vitest";
import { ADOPTER_APPLICATION_SELECT, REVIEWER_APPLICATION_SELECT } from "./adoption-common";
describe("role-safe application projections", () => {
  it("never selects legacy or private notes for adopters", () => {
    expect(ADOPTER_APPLICATION_SELECT).not.toContain("internal_notes");
    expect(ADOPTER_APPLICATION_SELECT).not.toContain("application_private_notes");
    expect(ADOPTER_APPLICATION_SELECT).not.toContain("note,");
  });
  it("adds private notes only to reviewer projections", () => {
    expect(REVIEWER_APPLICATION_SELECT).toContain("application_private_notes");
  });
});
