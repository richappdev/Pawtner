export interface AiSafetyResult {
  ok: boolean;
  flags: string[];
}

function flattenFacts(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenFacts);
  }

  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(flattenFacts);
  }

  return [];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function checkAiContent(text: string, structuredFacts: unknown): AiSafetyResult {
  const flags: string[] = [];
  const normalizedText = normalize(text);
  const facts = flattenFacts(structuredFacts).map(normalize);

  if (/\b(donate|donation|fundraiser|fundraising|go\s*fund\s*me|contribute\s+money)\b/i.test(text)) {
    flags.push("fundraising_or_donation_solicitation");
  }

  if (/\b(if you (?:really )?(?:care|love)|don't (?:abandon|let .* die)|last chance|only you can save|you must help)\b/i.test(text)) {
    flags.push("emotional_coercion");
  }

  const medicalClaims = normalizedText.match(
    /\b(?:diagnosed|diagnosis|medication|medicated|vaccinated|vaccine|treatment|surgery|disease|condition|allerg(?:y|ies)|vet(?:erinarian)?)\b/g,
  ) ?? [];
  const hasUnsupportedMedicalClaim = medicalClaims.some(
    (claim) => !facts.some((fact) => fact.includes(claim)),
  );

  if (hasUnsupportedMedicalClaim) {
    flags.push("unsupported_medical_claim");
  }

  return { ok: flags.length === 0, flags };
}
