import { getFosterApplications } from "@/app/api/_domains/operational-queues";

export async function GET(request: Request) {
  return getFosterApplications(request);
}
