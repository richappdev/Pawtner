import { getFollowup, patchFollowup } from "@/app/api/_domains/followups";

type Context = { params: Promise<{ id: string; followupId: string }> };

export async function GET(_request: Request, context: Context) {
  const { id, followupId } = await context.params;
  return getFollowup(id, followupId);
}

export async function PATCH(request: Request, context: Context) {
  const { id, followupId } = await context.params;
  return patchFollowup(request, id, followupId);
}
