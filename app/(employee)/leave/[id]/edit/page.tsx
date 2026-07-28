import type { Metadata } from "next";

import { EditRequestView } from "@/components/leave/edit-request-view";

export const metadata: Metadata = { title: "Edit Leave Request · LeaveFlow" };

export default async function EditLeaveRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditRequestView requestId={id} />;
}
