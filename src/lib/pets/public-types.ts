import type { PetSpecies, PetStatus } from "@/lib/schemas/pet";

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

export interface PublicPetSummary {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  sex: "male" | "female" | "unknown" | null;
  ageMonths: number | null;
  region: string | null;
  status: PetStatus;
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
  sterilized: boolean | null;
  microchipped: boolean | null;
  vaccinated: boolean | null;
  dewormed: boolean | null;
  specialCare: string | null;
  adoptionConditions: string | null;
  media: PetMediaView[];
  healthRecords: PublicHealthRecord[];
  missingInformation: string[];
}
