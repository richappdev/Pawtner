import { getApplication, patchApplication } from "@/app/api/_domains/applications";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return getApplication(request, (await params).id);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return patchApplication(request, (await params).id);
}
