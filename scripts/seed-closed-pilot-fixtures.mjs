import { createClient } from "@supabase/supabase-js";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const environment = process.env.PAWTNER_ENV;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.STAGING_FIXTURE_PASSWORD;
const firebaseProjectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (environment !== "local") {
  throw new Error("Closed-pilot fixtures run only with PAWTNER_ENV=local.");
}
if (!url || !key || !password || password.length < 12 || !firebaseProjectId) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and a 12+ character STAGING_FIXTURE_PASSWORD are required.");
}
const supabaseHost = new URL(url).hostname;
if (supabaseHost.endsWith(".supabase.co") || firebaseProjectId === "pawtner-app-2026") {
  throw new Error("Refusing to install synthetic fixtures in production.");
}
if (!["127.0.0.1", "localhost"].includes(supabaseHost) || firebaseProjectId !== "pawtner-local") {
  throw new Error("Local fixtures must use local Supabase and the pawtner-local Firebase emulator.");
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error("FIREBASE_AUTH_EMULATOR_HOST is required for local fixtures.");
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const firebaseApp = getApps()[0] ?? initializeApp({ projectId: firebaseProjectId });
const firebaseAuth = getAuth(firebaseApp);
const people = [
  ["admin", "pilot-admin@pawtner.invalid", "Pilot Admin"],
  ["pending", "pilot-pending-foster@pawtner.invalid", "Pending Foster"],
  ["fosterA", "pilot-foster-a@pawtner.invalid", "Approved Foster A"],
  ["fosterB", "pilot-foster-b@pawtner.invalid", "Approved Foster B"],
  ["adopterA", "pilot-adopter-a@pawtner.invalid", "Adopter A"],
  ["adopterB", "pilot-adopter-b@pawtner.invalid", "Adopter B"],
  ["adopterC", "pilot-adopter-c@pawtner.invalid", "Adopter C"],
];

const users = {};
for (const [keyName, email, displayName] of people) {
  let firebaseUser;
  try {
    firebaseUser = await firebaseAuth.getUserByEmail(email);
    firebaseUser = await firebaseAuth.updateUser(firebaseUser.uid, {
      password,
      displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    firebaseUser = await firebaseAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
  }
  const { data: internalUserId, error: provisionError } = await supabase.rpc(
    "provision_firebase_identity",
    { p_firebase_uid: firebaseUser.uid, p_email: email, p_display_name: displayName },
  );
  if (provisionError || !internalUserId) throw provisionError ?? new Error(`Failed to provision ${email}`);
  users[keyName] = internalUserId;
}

async function upsert(table, rows, onConflict = "id") {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

await upsert("user_roles", [
  { user_id: users.admin, role: "admin" },
  { user_id: users.fosterA, role: "foster" },
  { user_id: users.fosterB, role: "foster" },
], "user_id,role");
const fosterIds = {
  pending: "71000000-0000-4000-8000-000000000001",
  a: "71000000-0000-4000-8000-000000000002",
  b: "71000000-0000-4000-8000-000000000003",
};
await upsert("foster_profiles", [
  { id: fosterIds.pending, user_id: users.pending, display_name: "Pending Foster", status: "submitted", region: "Taipei City", care_capacity: 2, submitted_at: new Date().toISOString() },
  { id: fosterIds.a, user_id: users.fosterA, display_name: "Approved Foster A", status: "approved", region: "New Taipei City", care_capacity: 4, reviewed_at: new Date().toISOString() },
  { id: fosterIds.b, user_id: users.fosterB, display_name: "Approved Foster B", status: "approved", region: "Taichung City", care_capacity: 3, reviewed_at: new Date().toISOString() },
]);

const questionnaire = (await supabase.from("questionnaires").select("id,version").eq("is_active", true).order("version", { ascending: false }).limit(1).single()).data;
if (!questionnaire) throw new Error("Active questionnaire is missing.");
const answers = {
  housing_type: "house", usable_home_size_sqm: 80, has_fenced_yard: true,
  daily_care_hours: 4, has_children: false, has_dogs: false,
  can_administer_medication: true, can_provide_grooming: true,
  preferred_energy_levels: ["low", "medium", "high"],
};
await upsert("adopter_questionnaire_responses", [users.adopterA, users.adopterB, users.adopterC].map((userId) => ({
  user_id: userId, questionnaire_id: questionnaire.id, questionnaire_version: questionnaire.version,
  answers, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
})), "user_id,questionnaire_version");

const pets = {
  privateA: "72000000-0000-4000-8000-000000000001",
  privateB: "72000000-0000-4000-8000-000000000002",
  privateC: "72000000-0000-4000-8000-000000000003",
  government: "72000000-0000-4000-8000-000000000004",
};
await upsert("pets", [
  { id: pets.privateA, foster_profile_id: fosterIds.a, source_type: "private_foster", name: "Pilot Miso", species: "dog", status: "application_pending", review_status: "approved", is_published: true, region: "New Taipei City", personality_summary: "Calm structured pilot fixture.", adoption_conditions: "Structured matching required." },
  { id: pets.privateB, foster_profile_id: fosterIds.a, source_type: "private_foster", name: "Pilot Nori", species: "cat", status: "application_pending", review_status: "approved", is_published: true, region: "New Taipei City", personality_summary: "Moderate energy pilot fixture.", adoption_conditions: "Indoor home." },
  { id: pets.privateC, foster_profile_id: fosterIds.b, source_type: "private_foster", name: "Pilot Taro", species: "dog", status: "adopted", review_status: "approved", is_published: false, region: "Taichung City", personality_summary: "Completed adoption fixture.", adoption_conditions: "Follow-up participation." },
  // Insert as a temporary private record because the deferred government-source
  // constraint commits at the end of each REST request. It is converted after
  // its external source record exists below.
  { id: pets.government, foster_profile_id: fosterIds.b, source_type: "private_foster", name: "Pilot Shelter Pet", species: "dog", status: "available", review_status: "approved", is_published: true, region: "Taipei City", personality_summary: null, adoption_conditions: null },
]);
await upsert("pet_traits", [
  { pet_id: pets.privateA, energy_level: 2, child_friendly: 4, sociability_dogs: 3 },
  { pet_id: pets.privateB, energy_level: 3, child_friendly: 3, sociability_dogs: 2 },
  { pet_id: pets.privateC, energy_level: 4, child_friendly: 4, sociability_dogs: 4 },
], "pet_id");
await upsert("pet_match_requirements", [
  { pet_id: pets.privateA, allows_apartment: true, requires_fenced_yard: false, minimum_daily_care_hours: 2, requires_medication_ability: true, requires_grooming_ability: false, allows_children: true, allows_dogs: true, energy_level: "low" },
  { pet_id: pets.privateB, allows_apartment: true, requires_fenced_yard: false, minimum_daily_care_hours: 1, requires_medication_ability: false, requires_grooming_ability: true, allows_children: true, allows_dogs: false, energy_level: "medium" },
  { pet_id: pets.privateC, allows_apartment: false, requires_fenced_yard: true, minimum_daily_care_hours: 3, requires_medication_ability: false, requires_grooming_ability: false, allows_children: true, allows_dogs: true, energy_level: "high" },
], "pet_id");

const { data: source } = await supabase.from("pet_sources").select("id").eq("source_key", "moa-animal-adoption").single();
if (source) await upsert("pet_source_records", [{
  pet_id: pets.government, source_id: source.id, external_id: "PAWTNER-PILOT-GOV-1",
  shelter_id: "pilot", shelter_name: "Pilot Official Shelter", shelter_phone: "0000000000",
  official_url: "https://www.pet.gov.tw/", availability: "open", quality_status: "clean",
  publication_status: "published", content_hash: "pilot-fixture", raw_payload: {}, last_seen_at: new Date().toISOString(),
}], "pet_id");
if (!source) throw new Error("Government pet source is missing.");
const { error: governmentPetError } = await supabase
  .from("pets")
  .update({ source_type: "government", foster_profile_id: null })
  .eq("id", pets.government);
if (governmentPetError) throw new Error(`pets: ${governmentPetError.message}`);

const applications = {
  submitted: "73000000-0000-4000-8000-000000000001",
  screening: "73000000-0000-4000-8000-000000000002",
  adopted: "73000000-0000-4000-8000-000000000003",
};
await upsert("adoption_applications", [
  { id: applications.submitted, pet_id: pets.privateA, adopter_user_id: users.adopterA, status: "submitted", match_score: 88, match_breakdown: { evaluatedCriteria: 5 } },
  { id: applications.screening, pet_id: pets.privateB, adopter_user_id: users.adopterB, status: "screening", match_score: 75, match_breakdown: { evaluatedCriteria: 4 } },
  { id: applications.adopted, pet_id: pets.privateC, adopter_user_id: users.adopterC, status: "adopted", match_score: 92, match_breakdown: { evaluatedCriteria: 6 } },
]);
await upsert("application_answers", Object.values(applications).map((applicationId, index) => ({
  id: `73500000-0000-4000-8000-00000000000${index + 1}`,
  application_id: applicationId,
  questionnaire_id: questionnaire.id,
  answers: {
    questionnaire_version: questionnaire.version,
    answers,
    match: { score: [88, 75, 92][index], evaluatedCriteria: [5, 4, 6][index] },
  },
})), "id");
await upsert("application_status_history", Object.entries(applications).map(([status, applicationId], index) => ({
  id: `74000000-0000-4000-8000-00000000000${index + 1}`, application_id: applicationId,
  from_status: null, to_status: status === "adopted" ? "adopted" : status, changed_by: users.admin,
})), "id");
const adoptedAt = Date.now() - 35 * 86_400_000;
await upsert("adoption_followups", [7, 30, 90].map((day, index) => ({
  id: `75000000-0000-4000-8000-00000000000${index + 1}`, application_id: applications.adopted,
  day_offset: day, due_at: new Date(adoptedAt + day * 86_400_000).toISOString(),
  status: day === 7 ? "completed" : "pending",
  ...(day === 7 ? { submitted_at: new Date(adoptedAt + 8 * 86_400_000).toISOString(), reviewed_at: new Date(adoptedAt + 9 * 86_400_000).toISOString(), reviewed_by: users.fosterB, response: { summary: "Stable" }, outcome: "stable", status: "completed", completed_at: new Date(adoptedAt + 9 * 86_400_000).toISOString() } : {}),
})), "application_id,day_offset");
await upsert("notifications", [{
  id: "76000000-0000-4000-8000-000000000001", user_id: users.adopterC,
  kind: "adoption_followup_due", title: "30-day adoption check-in", body: "Your pilot follow-up is ready.",
  href: `/applications/${applications.adopted}`, resource_type: "adoption_followup", resource_id: "75000000-0000-4000-8000-000000000002",
  available_at: new Date(adoptedAt + 30 * 86_400_000).toISOString(),
}]);
await upsert("pilot_invitations", [users.adopterA, users.adopterB, users.adopterC].map((userId, index) => ({
  id: `77000000-0000-4000-8000-00000000000${index + 1}`, email: people[index + 4][1],
  token_hash: `staging-fixture-${index + 1}`, intended_role: "adopter", invited_by: users.admin,
  expires_at: "2099-01-01T00:00:00Z", accepted_at: new Date().toISOString(), accepted_by: userId,
})), "id");
const { error: featureFlagError } = await supabase
  .from("feature_flags")
  .update({ enabled: true, updated_at: new Date().toISOString() })
  .eq("key", "closed_pilot_adoption_operations");
if (featureFlagError) throw new Error(`feature_flags: ${featureFlagError.message}`);
console.info(JSON.stringify({ event: "closed_pilot_fixtures.seeded", environment, users: people.length, pets: Object.keys(pets).length, applications: Object.keys(applications).length }));
