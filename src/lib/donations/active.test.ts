import { describe, expect, it } from "vitest";

import { safeExternalUrl } from "./active";

describe("safeExternalUrl", () => {
  it("accepts HTTPS donation destinations", () => {
    expect(safeExternalUrl("https://charity.example/donate")).toBe(
      "https://charity.example/donate",
    );
  });

  it.each([
    "http://charity.example/donate",
    "javascript:alert(1)",
    "not-a-url",
  ])("rejects unsafe donation destination %s", (value) => {
    expect(safeExternalUrl(value)).toBeNull();
  });
});
