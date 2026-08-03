import { getAdminFosters } from "@/app/api/_domains/operational-queues";

export async function GET(request: Request) {
  return getAdminFosters(request);
}
