import { describe, expect, it } from "vitest";

import { profileUpdateSchema } from "./profile";

describe("profileUpdateSchema", () => {
  it("accepts supported profile fields", () => {
    expect(profileUpdateSchema.parse({ display_name: "測試使用者", phone: "0900000000" })).toEqual({
      display_name: "測試使用者",
      phone: "0900000000",
    });
  });

  it("rejects locale updates", () => {
    expect(profileUpdateSchema.safeParse({ locale: "en" }).success).toBe(false);
  });
});
