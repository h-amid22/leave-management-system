import type { Metadata } from "next";

import { RequestDetails } from "@/components/leave/request-details";

export const metadata: Metadata = { title: "Leave Request · LeaveFlow" };

export default async function LeaveRequestDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RequestDetails requestId={id} />;
}
