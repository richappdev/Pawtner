import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUS_PRESENTATION,
  formatAge,
  PET_STATUS_PRESENTATION,
} from "@/lib/pets/presentation";
import { applicationStatusSchema } from "@/lib/schemas/application";
import { petStatusSchema } from "@/lib/schemas/pet";

describe("pet status presentation", () => {
  it("covers every database pet status with text, icon, and semantic tone", () => {
    for (const status of petStatusSchema.options) {
      expect(PET_STATUS_PRESENTATION[status]).toMatchObject({
        label: expect.any(String),
        description: expect.any(String),
        icon: expect.any(String),
        variant: expect.any(String),
      });
    }
  });

  it("uses explicit semantic states for the public adoption journey", () => {
    expect(PET_STATUS_PRESENTATION.available.variant).toBe("success");
    expect(PET_STATUS_PRESENTATION.application_pending.variant).toBe("pending");
    expect(PET_STATUS_PRESENTATION.trial_adoption.variant).toBe("process");
    expect(PET_STATUS_PRESENTATION.adopted.variant).toBe("adopted");
    expect(PET_STATUS_PRESENTATION.medical_hold.variant).toBe("danger");
  });
});

describe("application status presentation", () => {
  it("covers every application enum value", () => {
    for (const status of applicationStatusSchema.options) {
      expect(APPLICATION_STATUS_PRESENTATION[status]?.label).toBeTruthy();
    }
  });
});

describe("age formatting", () => {
  it("formats unknown, month, year, and mixed ages in Traditional Chinese", () => {
    expect(formatAge(null)).toBe("年齡待確認");
    expect(formatAge(8)).toBe("8 個月");
    expect(formatAge(24)).toBe("2 歲");
    expect(formatAge(29)).toBe("2 歲 5 個月");
  });
});
