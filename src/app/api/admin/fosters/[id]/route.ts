import { getAdminFosters, reviewFoster } from "@/app/api/_domains/operational-queues";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return getAdminFosters(request, (await context.params).id);
}
export async function PATCH(request: Request, context: Context) {
  return reviewFoster(request, (await context.params).id);
}
