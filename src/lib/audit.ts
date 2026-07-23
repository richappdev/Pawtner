export interface AuditLogInput {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogSupabase {
  from(table: "audit_logs"): {
    insert(record: {
      actor_id: string;
      action: string;
      resource_type: string;
      resource_id: string;
      metadata: Record<string, unknown>;
    }): PromiseLike<{ error: { message: string } | null }>;
  };
}

export async function writeAuditLog(supabase: AuditLogSupabase, input: AuditLogInput): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Unable to write audit log: ${error.message}`);
  }
}
