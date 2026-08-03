import { getFosterApplications } from "@/app/api/_domains/operational-queues";
import { patchApplication } from "@/app/api/_domains/applications";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return getFosterApplications(request, (await context.params).id);
}
export async function PATCH(request: Request, context: Context) {
  return patchApplication(request, (await context.params).id);
}
