import type { PetSpecies, PetStatus } from "@/lib/schemas/pet";

export type PetSourceType = "private_foster" | "government";
export type PetAgeBand = "child" | "adult" | "senior" | "unknown";
export type PetBodySize = "small" | "medium" | "large" | "unknown";

export interface PetMediaView {
  id: string;
  url: string;
  mediaType: "image" | "video";
  isCover: boolean;
  isAiEdited: boolean;
  sortOrder: number;
  alt: string;
}

export interface OrganizationTrust {
  name: string;
  slug: string | null;
  isVerified: boolean;
}

export interface PetSourceAttribution {
  label: string;
  attribution: string;
  datasetUrl: string;
  licenseName: string;
  licenseUrl: string;
  officialReference: string | null;
  lastSeenAt: string;
}

export interface ShelterContact {
  name: string | null;
  phone: string | null;
  address: string | null;
}

export type AdoptionAction =
  | { kind: "pawtner_application" }
  | {
      kind: "shelter_contact";
      phone: string | null;
      address: string | null;
      officialUrl: string;
      adoptionOpenAt: string | null;
    };

export interface PublicPetSummary {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  sex: "male" | "female" | "unknown" | null;
  ageMonths: number | null;
  ageBand: PetAgeBand | null;
  bodySize: PetBodySize | null;
  region: string | null;
  status: PetStatus;
  sourceType: PetSourceType;
  source: PetSourceAttribution | null;
  freshnessText: string | null;
  shelter: ShelterContact | null;
  adoptionAction: AdoptionAction;
  personalitySummary: string | null;
  temperamentTags: string[];
  fosterDisplayName: string;
  organization: OrganizationTrust | null;
  coverMedia: PetMediaView | null;
  profileCompleteness: number;
  publishedAt: string | null;
}

export interface PublicHealthRecord {
  id: string;
  recordDate: string;
  title: string;
  details: string | null;
  isCritical: boolean;
}

export interface PublicPetDetail extends PublicPetSummary {
  weightKg: number | null;
  color: string | null;
  foundLocation: string | null;
  sterilized: boolean | null;
  microchipped: boolean | null;
  vaccinated: boolean | null;
  rabiesVaccinated: boolean | null;
  dewormed: boolean | null;
  specialCare: string | null;
  adoptionConditions: string | null;
  media: PetMediaView[];
  healthRecords: PublicHealthRecord[];
  missingInformation: string[];
}

export interface PublicPetSearch {
  q?: string;
  species?: PetSpecies;
  region?: string;
  source?: PetSourceType;
  availability?: "open";
  cursor?: string;
  limit?: number;
}

export interface PublicPetPage {
  items: PublicPetSummary[];
  nextCursor: string | null;
}
