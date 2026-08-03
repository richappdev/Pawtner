import { getAdminApplications } from "@/app/api/_domains/operational-queues";

export async function GET(request: Request) {
  return getAdminApplications(request);
}
