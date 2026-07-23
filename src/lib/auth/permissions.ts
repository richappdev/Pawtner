import { hasAnyRole, type AppRole } from "@/lib/types/roles";

export interface PermissionActor {
  id: string;
  roles: readonly AppRole[];
  organizationIds?: readonly string[];
}

export interface OwnedResource {
  ownerId?: string | null;
  organizationId?: string | null;
}

function ownsResource(actor: PermissionActor, resource: OwnedResource): boolean {
  return resource.ownerId === actor.id || (
    resource.organizationId !== undefined &&
    resource.organizationId !== null &&
    actor.organizationIds?.includes(resource.organizationId) === true
  );
}

function hasRole(actor: PermissionActor, roles: readonly AppRole[]): boolean {
  return hasAnyRole(actor.roles, roles);
}

export function canManagePet(actor: PermissionActor, pet: OwnedResource): boolean {
  return hasRole(actor, ["admin", "super_admin"]) ||
    (hasRole(actor, ["organization_manager"]) && ownsResource(actor, pet));
}

export function canReviewFoster(actor: PermissionActor, application: OwnedResource): boolean {
  return hasRole(actor, ["admin", "super_admin", "moderator", "support_agent"]) ||
    (hasRole(actor, ["organization_manager"]) && ownsResource(actor, application));
}

export function canAccessAdmin(actor: PermissionActor): boolean {
  return hasRole(actor, ["admin", "super_admin"]);
}

export function canApproveAi(actor: PermissionActor, content: OwnedResource = {}): boolean {
  return hasRole(actor, ["admin", "super_admin", "moderator"]) ||
    (hasRole(actor, ["organization_manager"]) && ownsResource(actor, content));
}

export function canManageOrders(actor: PermissionActor, order: OwnedResource): boolean {
  return hasRole(actor, ["admin", "super_admin", "support_agent"]) ||
    (hasRole(actor, ["organization_manager"]) && ownsResource(actor, order));
}
