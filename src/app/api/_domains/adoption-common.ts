import { getFlag } from "@/lib/feature-flags";
import { jsonError } from "@/lib/api/http";

export function requireAdoptionOperations() {
  return getFlag("closed_pilot_adoption_operations")
    ? null
    : jsonError("Closed-pilot adoption operations are unavailable.", 404);
}

export function adoptionMutationError(error: { code?: string; message: string }) {
  const status = error.code === "23505" ? 409
    : error.code === "42501" || error.code === "28000" ? 403
    : error.code === "P0002" ? 404
    : error.code === "23514" || error.code === "22023" || error.code === "55000" ? 409
    : 500;
  return jsonError(status === 500 ? "Unable to complete adoption operation." : error.message, status);
}

export const ADOPTER_APPLICATION_SELECT = [
  "id", "pet_id", "adopter_user_id", "status", "match_score", "match_breakdown",
  "created_at", "updated_at",
  "application_status_history(id,from_status,to_status,changed_by,created_at)",
  "application_answers(id,questionnaire_id,answers,created_at)",
  "adoption_followups(id,day_offset,due_at,submitted_at,reviewed_at,response,outcome,status,completed_at)",
].join(",");

export const REVIEWER_APPLICATION_SELECT = [
  ADOPTER_APPLICATION_SELECT,
  "application_private_notes(id,author_id,kind,note,created_at)",
].join(",");
