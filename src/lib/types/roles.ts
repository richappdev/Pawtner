export const APP_ROLES = [
  "guest",
  "adopter",
  "foster",
  "organization_manager",
  "support_agent",
  "moderator",
  "admin",
  "super_admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STAFF_ROLES = [
  "organization_manager",
  "support_agent",
  "moderator",
  "admin",
  "super_admin",
] as const satisfies readonly AppRole[];

export function isStaffRole(role: AppRole | null | undefined): boolean {
  return role !== null && role !== undefined && STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number]);
}

export function hasAnyRole(
  roles: readonly AppRole[] | null | undefined,
  allowedRoles: readonly AppRole[],
): boolean {
  return roles?.some((role) => allowedRoles.includes(role)) ?? false;
}
