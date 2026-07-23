import { describe, expect, it } from "vitest";

import { checkAiContent } from "./safety";

describe("checkAiContent", () => {
  it("flags fundraising solicitation", () => {
    const result = checkAiContent("Please donate today to save this pet.", {});

    expect(result).toEqual({
      ok: false,
      flags: ["fundraising_or_donation_solicitation"],
    });
  });

  it("flags medical claims absent from structured facts", () => {
    const result = checkAiContent("Milo is vaccinated and requires daily medication.", {
      name: "Milo",
      age: 3,
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain("unsupported_medical_claim");
  });
});
