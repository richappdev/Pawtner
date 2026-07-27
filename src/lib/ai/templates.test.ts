import { describe, expect, it } from "vitest";

import { renderDeterministicDraft } from "@/lib/ai/templates";

describe("renderDeterministicDraft", () => {
  it("renders a reviewable pet draft from structured facts", () => {
    const result = renderDeterministicDraft("pet_description", {
      name: "小白",
      personalitySummary: "親人、喜歡散步",
      adoptionConditions: "每日陪伴",
    });
    expect(result.content).toContain("小白");
    expect(result.content).toContain("發布前須由中途確認");
    expect(result.model).toBe("pawtner-template-v1");
  });

  it("removes private contact and identity fields", () => {
    const result = renderDeterministicDraft("support_reply", {
      petName: "阿福",
      private_address: "private",
      phone: "0900",
      document_storage_path: "secret/path",
    });
    expect(result.structuredFacts).not.toHaveProperty("private_address");
    expect(result.structuredFacts).not.toHaveProperty("phone");
    expect(result.content).not.toContain("secret/path");
  });
});
